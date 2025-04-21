import {
	sanitizeKey,
	isDuplicateError,
	PathItem,
	Operation,
	HTTP_METHODS,
	ApiResponse,
} from '../../../utils/openapiUtils.js';
import { PERMIT_EXTENSIONS, ProcessorContext } from './openapiConstants.js';
import {
	ResourceResponse,
	RelationResponse,
	RelationRequest,
	DerivedRoleRequest,
	DerivedRoleResponse,
} from './apiTypes.js';

// Define function type signatures
type CreateResourceFunction = (
	key: string,
	name: string,
) => Promise<ApiResponse<ResourceResponse>>;
type CreateRelationFunction = (
	relationData: RelationRequest,
) => Promise<ApiResponse<RelationResponse>>;
type CreateDerivedRoleFunction = (
	derivedRoleData: DerivedRoleRequest,
) => Promise<ApiResponse<DerivedRoleResponse>>;
type SetProgressFunction = (message: string) => void;

// Define relation data type
interface RelationData {
	subject_resource: string;
	object_resource: string;
	key?: string;
	name?: string;
}

export async function processRelations(
	context: ProcessorContext,
	pathItems: Record<string, PathItem>,
	createResource: CreateResourceFunction,
	createRelation: CreateRelationFunction,
	setProgress: SetProgressFunction,
) {
	const { resources, relations, errors, warnings } = context;

	for (const [, pathItem] of Object.entries(pathItems || {})) {
		if (!pathItem || typeof pathItem !== 'object') continue;

		const typedPathItem = pathItem as PathItem;

		const rawResource = typedPathItem[PERMIT_EXTENSIONS.RESOURCE];
		if (!rawResource) continue;

		// Process HTTP methods
		for (const method of HTTP_METHODS) {
			const operation = typedPathItem[method] as Operation | undefined;
			if (!operation) continue;

			// Process relation
			const relation = operation[PERMIT_EXTENSIONS.RELATION];
			if (relation && typeof relation === 'object') {
				try {
					const relationData = relation as RelationData;

					const sanitizedRelation: RelationRequest = {
						subject_resource: sanitizeKey(relationData.subject_resource),
						object_resource: sanitizeKey(relationData.object_resource),
						key:
							relationData.key ||
							`${sanitizeKey(relationData.subject_resource)}_${sanitizeKey(relationData.object_resource)}`,
						name:
							relationData.name ||
							`${relationData.subject_resource} to ${relationData.object_resource}`,
					};

					// First, check if both resources exist, create if they don't
					if (!resources.has(sanitizedRelation.subject_resource)) {
						await createResource(
							sanitizedRelation.subject_resource,
							relationData.subject_resource,
						);
						resources.add(sanitizedRelation.subject_resource);
					}

					if (!resources.has(sanitizedRelation.object_resource)) {
						await createResource(
							sanitizedRelation.object_resource,
							relationData.object_resource,
						);
						resources.add(sanitizedRelation.object_resource);
					}

					setProgress(
						`Creating relation between ${sanitizedRelation.subject_resource} and ${sanitizedRelation.object_resource}...`,
					);

					// Add a small delay to allow resources to be registered
					await new Promise(resolve => setTimeout(resolve, 300));

					// Create the relation
					const relationResult = await createRelation(sanitizedRelation);

					if (relationResult.error) {
						if (!isDuplicateError(relationResult.error)) {
							errors.push(
								`Failed to create relation: ${JSON.stringify(relationResult.error)}`,
							);
						} else {
							warnings.push(`Relation already exists, skipping creation`);
						}
					}

					// Store the relation for use in role derivation
					relations.set(
						sanitizedRelation.key,
						JSON.stringify(sanitizedRelation),
					);
				} catch (relationError) {
					errors.push(`Error creating relation: ${relationError}`);
				}
			}
		}
	}

	return context;
}

export async function processDerivedRoles(
	context: ProcessorContext,
	pathItems: Record<string, PathItem>,
	createDerivedRole: CreateDerivedRoleFunction,
) {
	const { warnings } = context;

	for (const [, pathItem] of Object.entries(pathItems || {})) {
		if (!pathItem || typeof pathItem !== 'object') continue;

		const typedPathItem = pathItem as PathItem;

		// Process HTTP methods
		for (const method of HTTP_METHODS) {
			const operation = typedPathItem[method] as Operation | undefined;
			if (!operation) continue;

			// Process derived role
			const derivedRole = operation[PERMIT_EXTENSIONS.DERIVED_ROLE];
			if (derivedRole && typeof derivedRole === 'object') {
				type DerivedRoleData = {
					base_role: string;
					derived_role: string;
					resource?: string;
					relation?: string;
				};

				try {
					const derivedRoleData = derivedRole as DerivedRoleData;

					// Use the resource from the path if not specified
					const resourceKey = sanitizeKey(
						derivedRoleData.resource ||
							(typedPathItem[PERMIT_EXTENSIONS.RESOURCE] as string) ||
							'',
					);

					try {
						// Create the derived role
						const derivedRoleRequest: DerivedRoleRequest = {
							...derivedRoleData,
							resource: resourceKey,
						};

						const derivedRoleResult =
							await createDerivedRole(derivedRoleRequest);

						if (derivedRoleResult.error) {
							warnings.push(
								`Could not create role derivation automatically: ${JSON.stringify(derivedRoleResult.error)}`,
							);
						}
					} catch (innerError) {
						warnings.push(
							`Could not create role derivation automatically: ${innerError}`,
						);
					}
				} catch (derivedRoleError) {
					warnings.push(
						`Could not set up role derivation: ${derivedRoleError}`,
					);
				}
			}
		}
	}

	return context;
}
