import { useCallback, useMemo } from 'react';
import { MethodE, fetchUtil } from '../../utils/fetchUtil.js';
import { useAuth } from '../../components/AuthProvider.js';
import { PERMIT_API_URL } from '../../config.js';
import {
	ApiResponse,
	RelationObject,
	DerivedRoleObject,
} from '../../utils/openapiUtils.js';

/**
 * Hook for relation and role derivation API operations
 */
export const usePermitRelationApi = () => {
	const { authToken, scope } = useAuth();

	// Construct base URL with the correct project and environment IDs
	const getBaseUrl = useCallback(() => {
		return `${PERMIT_API_URL}/v2/schema/${scope.project_id}/${scope.environment_id}`;
	}, [scope.project_id, scope.environment_id]);

	/**
	 * Make authenticated API call
	 */
	const callApi = useCallback(
		async (
			endpoint: string,
			method: MethodE,
			body?: object,
		): Promise<ApiResponse> => {
			try {
				const response = await fetchUtil(
					endpoint,
					method,
					authToken,
					undefined,
					body,
				);

				return response as ApiResponse;
			} catch (error) {
				return { success: false, error: String(error) };
			}
		},
		[authToken],
	);

	/**
	 * Get a relation by key for a specific resource
	 */
	const getRelationByKey = useCallback(
		async (subjectResource: string, relationKey: string) => {
			const url = `${getBaseUrl()}/resources/${subjectResource}/relations/${relationKey}`;
			return await callApi(url, MethodE.GET);
		},
		[callApi, getBaseUrl],
	);

	/**
	 * Fetches relations for a resource
	 */
	const getResourceRelations = useCallback(
		async (resourceKey: string) => {
			try {
				const url = `${getBaseUrl()}/resources/${resourceKey}/relations`;
				return await callApi(url, MethodE.GET);
			} catch (error) {
				return { success: false, error: String(error) };
			}
		},
		[callApi, getBaseUrl],
	);

	/**
	 * Creates a relation between resources
	 */
	const createRelation = useCallback(
		async (relationObj: Partial<RelationObject>) => {
			// Check that both resources exist
			if (!relationObj.subject_resource || !relationObj.object_resource) {
				return {
					success: false,
					error:
						'Both subject_resource and object_resource are required for relations',
				};
			}

			const url = `${getBaseUrl()}/resources/${relationObj.subject_resource}/relations?object_resource=${relationObj.object_resource}`;

			return await callApi(url, MethodE.POST, {
				key: relationObj.key || 'relation',
				name: relationObj.name || 'Relation',
				subject_resource: relationObj.subject_resource, // This is required in the body
				description:
					relationObj.description || 'Relation created from OpenAPI spec',
			});
		},
		[callApi, getBaseUrl],
	);

	/**
	 * Creates a resource-specific role for derived role relationships
	 */
	const createResourceSpecificRole = useCallback(
		async (resourceKey: string, roleKey: string) => {
			// First check if the role already exists for this resource
			try {
				const checkUrl = `${getBaseUrl()}/resources/${resourceKey}/roles/${roleKey}`;
				const { data: existingRole, error } = await callApi(
					checkUrl,
					MethodE.GET,
				);

				if (existingRole && !error) {
					return { success: true, data: existingRole };
				}
			} catch (_unused) {
				// Role doesn't exist, continue to create it
			}

			const url = `${getBaseUrl()}/resources/${resourceKey}/roles`;

			return await callApi(url, MethodE.POST, {
				key: roleKey,
				name: roleKey,
				description: `Resource-specific role created for ${resourceKey}`,
			});
		},
		[callApi, getBaseUrl],
	);

	/**
	 * Creates a derived role using the users_with_role in granted_to field
	 * This approach dynamically determines the related resources
	 */
	const createDerivedRole = useCallback(
		async (derivedRoleObj: Partial<DerivedRoleObject>) => {
			// Make sure we have the required fields
			if (
				!derivedRoleObj.base_role ||
				!derivedRoleObj.derived_role ||
				!derivedRoleObj.resource
			) {
				return {
					success: false,
					error:
						'base_role, derived_role, and resource are all required for role derivation',
				};
			}

			try {
				// First, ensure the resource-specific derived role exists
				const subjectResource = derivedRoleObj.resource;
				await createResourceSpecificRole(
					subjectResource,
					derivedRoleObj.derived_role,
				);

				// Wait for role to be registered
				await new Promise(resolve => setTimeout(resolve, 2000));

				// Get relations for this resource to find the object resource
				const relationsResult = await getResourceRelations(subjectResource);

				if (
					!relationsResult.success ||
					!relationsResult.data ||
					!relationsResult.data.data ||
					!Array.isArray(relationsResult.data.data) ||
					relationsResult.data.data.length === 0
				) {
					return {
						success: false,
						error: `Could not find relations for resource ${subjectResource}`,
					};
				}

				// Find relation by key if specified, or use the first available relation
				const relationKey = derivedRoleObj.relation;
				let relationObj: { key: string; object_resource: string } | undefined;

				if (relationKey) {
					// Find relation by key with proper type casting
					const foundRelation = relationsResult.data.data.find(
						(rel: unknown) => {
							const typedRel = rel as { key: string };
							return typedRel.key === relationKey;
						},
					);
					relationObj = foundRelation as
						| { key: string; object_resource: string }
						| undefined;

					if (!relationObj) {
						return {
							success: false,
							error: `Could not find relation ${relationKey} for resource ${subjectResource}`,
						};
					}
				} else {
					// Just use the first relation
					relationObj = relationsResult.data.data[0] as {
						key: string;
						object_resource: string;
					};
					if (!relationObj) {
						return {
							success: false,
							error: `No relations found for resource ${subjectResource}`,
						};
					}
				}

				// Get the relation key with safe property access
				const relationToUse = relationObj ? relationObj.key : 'belongs_to';

				// Get the object_resource (if available) with safe property access
				const objectResource =
					relationObj && 'object_resource' in relationObj
						? relationObj.object_resource
						: 'blog_post';

				// Before creating the derivation, ensure the base role exists for the object resource
				await createResourceSpecificRole(
					objectResource,
					derivedRoleObj.base_role,
				);

				// Wait for base role to be registered
				await new Promise(resolve => setTimeout(resolve, 2000));

				// Now use the direct resource role update approach with granted_to
				const url = `${getBaseUrl()}/resources/${subjectResource}/roles/${derivedRoleObj.derived_role}`;

				return await callApi(url, MethodE.PATCH, {
					granted_to: {
						users_with_role: [
							{
								role: derivedRoleObj.base_role,
								on_resource: objectResource,
								linked_by_relation: relationToUse,
							},
						],
					},
				});
			} catch (error) {
				return { success: false, error: String(error) };
			}
		},
		[callApi, getBaseUrl, createResourceSpecificRole, getResourceRelations],
	);

	return useMemo(
		() => ({
			getRelationByKey,
			getResourceRelations,
			createRelation,
			createResourceSpecificRole,
			createDerivedRole,
		}),
		[
			getRelationByKey,
			getResourceRelations,
			createRelation,
			createResourceSpecificRole,
			createDerivedRole,
		],
	);
};
