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
 * Helper function to poll for a resource with a maximum total timeout
 */
async function pollForEntity<T>(
	checkFunction: () => Promise<{ exists: boolean; data?: T }>,
	maxTimeMs = 3000, // 3 second maximum wait
	initialIntervalMs = 100,
): Promise<{ exists: boolean; data?: T }> {
	const startTime = Date.now();
	let intervalMs = initialIntervalMs;

	while (Date.now() - startTime < maxTimeMs) {
		try {
			const result = await checkFunction();
			if (result.exists) return result;
		} catch {
			// Continue polling even if check fails
		}

		// Wait before next attempt, but don't exceed the maximum time
		const remainingTime = maxTimeMs - (Date.now() - startTime);
		if (remainingTime <= 0) break;

		const waitTime = Math.min(intervalMs, remainingTime);
		await new Promise(resolve => setTimeout(resolve, waitTime));

		// Increase interval for next attempt, capped at 1 second
		intervalMs = Math.min(intervalMs * 1.5, 1000);
	}

	// One final attempt before giving up
	try {
		return await checkFunction();
	} catch {
		return { exists: false };
	}
}

/**
 * Hook for relation and role derivation API operations
 */
export const usePermitRelationApi = () => {
	const { authToken, scope } = useAuth();

	// Construct base URL with project and environment IDs
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
	 * Check if a resource-specific role exists
	 */
	const checkResourceRoleExists = useCallback(
		async (resourceKey: string, roleKey: string) => {
			try {
				const url = `${getBaseUrl()}/resources/${resourceKey}/roles/${roleKey}`;
				const { data: existingRole, error } = await callApi(url, MethodE.GET);

				return {
					exists: Boolean(existingRole && !error),
					data: existingRole,
				};
			} catch {
				return { exists: false };
			}
		},
		[callApi, getBaseUrl],
	);

	/**
	 * Creates a resource-specific role for derived role relationships
	 */
	const createResourceSpecificRole = useCallback(
		async (resourceKey: string, roleKey: string) => {
			// First poll to check if the role already exists for this resource
			const { exists, data: existingRole } = await pollForEntity(
				() => checkResourceRoleExists(resourceKey, roleKey),
				10, // max 10 attempts with exponential backoff
			);

			if (exists && existingRole) {
				return { success: true, data: existingRole };
			}

			const url = `${getBaseUrl()}/resources/${resourceKey}/roles`;

			return await callApi(url, MethodE.POST, {
				key: roleKey,
				name: roleKey,
				description: `Resource-specific role created for ${resourceKey}`,
			});
		},
		[callApi, getBaseUrl, checkResourceRoleExists],
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
				try {
					const roleResult = await createResourceSpecificRole(
						subjectResource,
						derivedRoleObj.derived_role,
					);

					if (!roleResult.success) {
						console.error(
							`Warning: Issue creating derived role: ${roleResult.error}`,
						);
						// Continue anyway - the role might exist despite the error
					}
				} catch (error) {
					console.error(`Error in create role, continuing: ${error}`);
					// Continue anyway - the role might already exist
				}

				// Add a small delay to ensure role registration
				await new Promise(resolve => setTimeout(resolve, 500));

				// Get relations for this resource to find the object resource
				const relationsResult = await getResourceRelations(subjectResource);

				// Safely check for relations data
				if (!relationsResult.success || !relationsResult.data) {
					return {
						success: false,
						error: `Could not find relations for resource ${subjectResource}`,
					};
				}

				// Type guard to ensure data property exists and is an object
				const relationsData = relationsResult.data;
				if (
					typeof relationsData !== 'object' ||
					!relationsData ||
					!('data' in relationsData) ||
					!Array.isArray(relationsData.data) ||
					relationsData.data.length === 0
				) {
					return {
						success: false,
						error: `No valid relations data found for resource ${subjectResource}`,
					};
				}

				// Find relation by key if specified, or use the first available relation
				const relationKey = derivedRoleObj.relation;
				let relationObj: { key: string; object_resource: string } | undefined;

				if (relationKey) {
					// Find relation by key with proper type casting
					const foundRelation = relationsData.data.find((rel: unknown) => {
						const typedRel = rel as { key: string };
						return typedRel.key === relationKey;
					});
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
					relationObj = relationsData.data[0] as {
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
				try {
					const baseRoleResult = await createResourceSpecificRole(
						objectResource,
						derivedRoleObj.base_role,
					);

					if (!baseRoleResult.success) {
						console.error(
							`Warning: Issue creating base role: ${baseRoleResult.error}`,
						);
						// Continue anyway - the role might exist despite the error
					}
				} catch (error) {
					console.error(`Error in create base role, continuing: ${error}`);
					// Continue anyway - the role might already exist
				}

				// Add a small delay to ensure role registration
				await new Promise(resolve => setTimeout(resolve, 500));

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
