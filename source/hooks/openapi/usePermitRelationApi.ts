import { useCallback, useMemo } from 'react';
import { useAuth } from '../../components/AuthProvider.js';
import {
	ApiResponse,
	RelationObject,
	DerivedRoleObject,
	isDuplicateError,
} from '../../utils/openapiUtils.js';
import useClient from '../useClient.js';
import { components } from '../../lib/api/v1.js';

// --- Type Definitions ---
type ResourceRoleRead = components['schemas']['ResourceRoleRead'];
type RelationRead = components['schemas']['RelationRead'];
type PaginatedResult<T> = {
	data?: T[];
	total_count?: number;
	page_count?: number;
};
type PaginatedRelationRead = PaginatedResult<RelationRead>;
type ResourceRoleUpdate = components['schemas']['ResourceRoleUpdate'];
type RelationCreate = components['schemas']['RelationCreate'];
type ResourceRoleCreate = components['schemas']['ResourceRoleCreate'];
type DerivedRoleResponse = DerivedRoleObject;

// --- Type Guards for Error Handling ---
function hasProperty<K extends string>(
	obj: unknown,
	key: K,
): obj is { [P in K]: unknown } {
	return typeof obj === 'object' && obj !== null && key in obj;
}
interface ErrorWithResponse {
	response?: { status?: number };
	status?: number;
	error?: unknown;
	message?: unknown;
}
function isErrorWithResponse(err: unknown): err is ErrorWithResponse {
	return typeof err === 'object' && err !== null;
}
interface ErrorWithErrorDetails {
	error?: { detail?: unknown; message?: unknown } | string;
	message?: unknown;
}
function isErrorWithErrorDetails(err: unknown): err is ErrorWithErrorDetails {
	return typeof err === 'object' && err !== null;
}

// --- Polling Helper ---
async function pollForEntity<T>(
	checkFunction: () => Promise<{ exists: boolean; data?: T }>,
	maxTimeMs = 3000,
	initialIntervalMs = 100,
): Promise<{ exists: boolean; data?: T }> {
	const startTime = Date.now();
	let intervalMs = initialIntervalMs;
	while (Date.now() - startTime < maxTimeMs) {
		try {
			const result = await checkFunction();
			if (result.exists) return result;
		} catch {
			/* Continue */
		}
		const remainingTime = maxTimeMs - (Date.now() - startTime);
		if (remainingTime <= 0) break;
		const waitTime = Math.min(intervalMs, remainingTime);
		await new Promise(resolve => setTimeout(resolve, waitTime));
		intervalMs = Math.min(intervalMs * 1.5, 1000);
	}
	try {
		return await checkFunction();
	} catch {
		return { exists: false };
	}
}

// --- The Hook ---
/**
 * Hook for relation and role derivation API operations
 */
export const usePermitRelationApi = () => {
	useAuth();
	const { authenticatedApiClient } = useClient();

	/**
	 * Generic error handler using unknown
	 */
	const handleError = <T>(
		_operation: string,
		error: unknown,
	): ApiResponse<T> => {
		let status: number | undefined;
		let message = 'An unknown error occurred';
		let errorDetails: unknown = error;

		if (isErrorWithResponse(error)) {
			status = error.response?.status ?? error.status;
			errorDetails = error.error ?? error.message ?? error;
		}

		if (typeof errorDetails === 'string') {
			message = errorDetails;
			if (message.startsWith('{') && message.endsWith('}')) {
				try {
					const parsed = JSON.parse(message);
					message = parsed.detail || parsed.message || message;
				} catch {
					/* Ignore */
				}
			}
		} else if (isErrorWithErrorDetails(errorDetails)) {
			if (typeof errorDetails.error === 'string') {
				message = errorDetails.error;
			} else if (
				hasProperty(errorDetails.error, 'detail') &&
				typeof errorDetails.error.detail === 'string'
			) {
				message = errorDetails.error.detail;
			} else if (
				hasProperty(errorDetails.error, 'message') &&
				typeof errorDetails.error.message === 'string'
			) {
				message = errorDetails.error.message;
			} else if (typeof errorDetails.message === 'string') {
				message = errorDetails.message;
			} else {
				message = JSON.stringify(errorDetails);
			}
		} else if (error instanceof Error) {
			message = error.message;
		} else {
			try {
				message = JSON.stringify(error);
			} catch {
				/* Fallback */
			}
		}

		if (isDuplicateError(error) || status === 409) {
			return {
				success: false,
				error: `Duplicate detected: ${message}`,
				status: 409,
			};
		}
		return { success: false, error: message, status };
	};

	/**
	 * Get a relation by key for a specific resource
	 */
	const getRelationByKey = useCallback(
		async (
			subjectResourceKey: string,
			relationKey: string,
		): Promise<ApiResponse<RelationRead>> => {
			const path =
				'/v2/schema/{proj_id}/{env_id}/resources/{resource_id}/relations/{relation_id}';
			const pathParams = {
				resource_id: subjectResourceKey,
				relation_id: relationKey,
			};
			try {
				const { data, error, response } = await authenticatedApiClient().GET(
					path,
					pathParams,
				);
				if (error)
					return handleError(
						`getRelationByKey (${subjectResourceKey}/${relationKey})`,
						{ error, response },
					);
				return { success: true, data, error: null, status: response.status };
			} catch (err: unknown) {
				return handleError(
					`getRelationByKey (${subjectResourceKey}/${relationKey})`,
					err,
				);
			}
		},
		[authenticatedApiClient],
	);

	/**
	 * Fetches relations for a resource
	 */
	const getResourceRelations = useCallback(
		async (
			resourceKey: string,
		): Promise<ApiResponse<PaginatedRelationRead>> => {
			const path =
				'/v2/schema/{proj_id}/{env_id}/resources/{resource_id}/relations';
			const pathParams = { resource_id: resourceKey };
			try {
				const { data, error, response } = await authenticatedApiClient().GET(
					path,
					pathParams,
				);
				if (error)
					return handleError(`getResourceRelations (${resourceKey})`, {
						error,
						response,
					});
				return {
					success: true,
					data: data as PaginatedRelationRead,
					error: null,
					status: response.status,
				};
			} catch (err: unknown) {
				return handleError(`getResourceRelations (${resourceKey})`, err);
			}
		},
		[authenticatedApiClient],
	);

	/**
	 * Creates a relation between resources
	 */
	const createRelation = useCallback(
		async (
			relationInput: Partial<RelationObject>,
		): Promise<ApiResponse<RelationRead>> => {
			if (!relationInput.subject_resource || !relationInput.object_resource) {
				return {
					success: false,
					error: 'Both subject_resource and object_resource are required',
				};
			}
			const path =
				'/v2/schema/{proj_id}/{env_id}/resources/{resource_id}/relations';
			const pathParams = { resource_id: relationInput.subject_resource };
			const body: RelationCreate = {
				key: relationInput.key || 'relation',
				name: relationInput.name || 'Relation',
				subject_resource: relationInput.object_resource,
				description:
					relationInput.description || 'Relation created from OpenAPI spec',
			};
			try {
				const { data, error, response } = await authenticatedApiClient().POST(
					path,
					pathParams,
					body,
				);
				if (error)
					return handleError(`createRelation (${relationInput.key})`, {
						error,
						response,
					});
				return { success: true, data, error: null, status: response.status };
			} catch (err: unknown) {
				return handleError(`createRelation (${relationInput.key})`, err);
			}
		},
		[authenticatedApiClient],
	);

	/**
	 * Check if a resource-specific role exists
	 */
	const checkResourceRoleExists = useCallback(
		async (
			resourceKey: string,
			roleKey: string,
		): Promise<{ exists: boolean; data?: ResourceRoleRead }> => {
			const path =
				'/v2/schema/{proj_id}/{env_id}/resources/{resource_id}/roles/{role_id}';
			const pathParams = { resource_id: resourceKey, role_id: roleKey };
			try {
				const {
					data: existingRole,
					error,
					response,
				} = await authenticatedApiClient().GET(path, pathParams);
				if (error && response?.status !== 404) {
					/* Log non-404 */
				}
				return { exists: Boolean(existingRole && !error), data: existingRole };
			} catch (error: unknown) {
				let status: number | undefined;
				if (isErrorWithResponse(error)) {
					status = error.response?.status ?? error.status;
				}
				if (status === 404) return { exists: false };
				return { exists: false };
			}
		},
		[authenticatedApiClient],
	);

	/**
	 * Creates a resource-specific role if it doesn't exist
	 */
	const createResourceSpecificRole = useCallback(
		async (
			resourceKey: string,
			roleKey: string,
		): Promise<ApiResponse<ResourceRoleRead>> => {
			const { exists, data: existingRole } = await pollForEntity(
				() => checkResourceRoleExists(resourceKey, roleKey),
				3000,
			);
			if (exists && existingRole) {
				return { success: true, data: existingRole, status: 200 };
			}

			const path =
				'/v2/schema/{proj_id}/{env_id}/resources/{resource_id}/roles';
			const pathParams = { resource_id: resourceKey };
			const body: ResourceRoleCreate = {
				key: roleKey,
				name: roleKey,
				description: `Resource-specific role for ${resourceKey}`,
			};
			try {
				const { data, error, response } = await authenticatedApiClient().POST(
					path,
					pathParams,
					body,
				);
				if (error && response?.status === 409) {
					const finalCheck = await checkResourceRoleExists(
						resourceKey,
						roleKey,
					);
					if (finalCheck.exists)
						return { success: true, data: finalCheck.data, status: 200 };
					return {
						success: false,
						error: `Role creation conflict for ${roleKey} on ${resourceKey}, but could not fetch existing role.`,
						status: 409,
					};
				} else if (error) {
					return handleError(
						`createResourceSpecificRole (${resourceKey}/${roleKey})`,
						{ error, response },
					);
				}
				return { success: true, data, error: null, status: response.status };
			} catch (err: unknown) {
				return handleError(
					`createResourceSpecificRole (${resourceKey}/${roleKey})`,
					err,
				);
			}
		},
		[authenticatedApiClient, checkResourceRoleExists],
	);

	/**
	 * Creates a derived role (role derivation via granted_to)
	 */
	const createDerivedRole = useCallback(
		async (
			derivedRoleInput: Partial<DerivedRoleObject>,
		): Promise<ApiResponse<DerivedRoleResponse>> => {
			const operation = `createDerivedRole (${derivedRoleInput.resource}/${derivedRoleInput.derived_role})`;
			if (
				!derivedRoleInput.base_role ||
				!derivedRoleInput.derived_role ||
				!derivedRoleInput.resource
			) {
				return {
					success: false,
					error: 'base_role, derived_role, and resource are required',
				};
			}
			const {
				base_role: baseRoleKey,
				derived_role: derivedRoleKey,
				resource: subjectResourceKey,
				relation: targetRelationKey,
			} = derivedRoleInput;

			try {
				//Ensure derived role exists on subject resource
				const roleCreateResult = await createResourceSpecificRole(
					subjectResourceKey,
					derivedRoleKey,
				);
				if (
					!roleCreateResult.success &&
					![200, 409].includes(roleCreateResult.status ?? 0)
				) {
					return {
						success: false,
						error: `Failed ensure derived role ${derivedRoleKey}: ${roleCreateResult.error}`,
						status: roleCreateResult.status,
					};
				}

				// Find relation and object resource
				const relationsResult = await getResourceRelations(subjectResourceKey);
				const relationsDataArray =
					(relationsResult.data as PaginatedRelationRead)?.data ??
					(relationsResult.data as unknown as RelationRead[]) ??
					[];
				if (
					!relationsResult.success ||
					!Array.isArray(relationsDataArray) ||
					relationsDataArray.length === 0
				) {
					return {
						success: false,
						error: `No relations found for resource ${subjectResourceKey}`,
						status: relationsResult.status,
					};
				}
				const relation = targetRelationKey
					? relationsDataArray.find(r => r.key === targetRelationKey)
					: relationsDataArray[0];
				if (!relation || !relation.subject_resource || !relation.key) {
					return {
						success: false,
						error: `Could not determine valid relation or target resource for ${subjectResourceKey}`,
					};
				}
				const objectResourceKey = relation.subject_resource;
				const relationToUseKey = relation.key;

				// Ensure base role exists on the object resource
				const baseRoleCreateResult = await createResourceSpecificRole(
					objectResourceKey,
					baseRoleKey,
				);
				if (
					!baseRoleCreateResult.success &&
					![200, 409].includes(baseRoleCreateResult.status ?? 0)
				) {
					return {
						success: false,
						error: `Failed ensure base role ${baseRoleKey} on ${objectResourceKey}: ${baseRoleCreateResult.error}`,
						status: baseRoleCreateResult.status,
					};
				}

				// Update the derived role with the granted_to rule
				const updatePath =
					'/v2/schema/{proj_id}/{env_id}/resources/{resource_id}/roles/{role_id}';
				const updatePathParams = {
					resource_id: subjectResourceKey,
					role_id: derivedRoleKey,
				};
				const updateBody: ResourceRoleUpdate = {
					granted_to: {
						users_with_role: [
							{
								role: baseRoleKey,
								on_resource: objectResourceKey,
								linked_by_relation: relationToUseKey,
								when: { no_direct_roles_on_object: false },
							},
						],
						when: { no_direct_roles_on_object: false },
					},
					extends: [],
				};
				const { error, response } = await authenticatedApiClient().PATCH(
					updatePath,
					updatePathParams,
					updateBody,
				);
				if (error)
					return handleError(operation + ' PATCH', { error, response });

				const successData: DerivedRoleResponse = {
					key: derivedRoleKey,
					name: derivedRoleKey,
					base_role: baseRoleKey,
					derived_role: derivedRoleKey,
					resource: subjectResourceKey,
					relation: relationToUseKey,
					description: derivedRoleInput.description,
				};
				return {
					success: true,
					data: successData,
					error: null,
					status: response.status,
				};
			} catch (error: unknown) {
				return handleError(operation, error);
			}
		},

		[authenticatedApiClient, createResourceSpecificRole, getResourceRelations],
	);

	// Return memoized API functions
	return useMemo(
		() => ({
			getRelationByKey,
			getResourceRelations,
			createRelation,
			createResourceSpecificRole,
			createDerivedRole,
			checkResourceRoleExists,
		}),
		// Final dependency array for useMemo should include all returned functions
		[
			getRelationByKey,
			getResourceRelations,
			createRelation,
			createResourceSpecificRole,
			createDerivedRole,
			checkResourceRoleExists,
		],
	);
};
