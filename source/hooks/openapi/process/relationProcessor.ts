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

// Helper function to process a single relation
async function processRelation(
	relationData: RelationData,
	resources: Set<string>,
	relations: Map<string, string>,
	errors: string[],
	warnings: string[],
	createResource: CreateResourceFunction,
	createRelation: CreateRelationFunction,
	setProgress: SetProgressFunction,
	path: string = 'unknown',
): Promise<boolean> {
	try {
		// Store original resource names for display and properly capitalized names
		const originalSubjectResource = relationData.subject_resource;
		const originalObjectResource = relationData.object_resource;

		// Sanitize keys for API operations
		const subjectResourceKey = sanitizeKey(originalSubjectResource);
		const objectResourceKey = sanitizeKey(originalObjectResource);

		// Prepare relation with proper naming
		const relationKey = relationData.key || 'parent';
		const relationName = relationData.name || 'parent';

		const sanitizedRelation: RelationRequest = {
			subject_resource: objectResourceKey,
			object_resource: subjectResourceKey,
			key: relationKey,
			name: relationName,
			description: `${originalSubjectResource} ${relationName} ${originalObjectResource}`,
		};

		// First, check if both resources exist, create if they don't
		if (!resources.has(subjectResourceKey)) {
			await createResource(subjectResourceKey, originalSubjectResource);
			resources.add(subjectResourceKey);
		}

		if (!resources.has(objectResourceKey)) {
			await createResource(objectResourceKey, originalObjectResource);
			resources.add(objectResourceKey);
		}

		setProgress(
			`Creating relation between ${originalSubjectResource} and ${originalObjectResource}...`,
		);

		// Add a small delay to allow resources to be registered
		await new Promise(resolve => setTimeout(resolve, 500));

		// Create the relation - with swapped subject/object
		const relationResult = await createRelation(sanitizedRelation);

		if (relationResult.error) {
			if (!isDuplicateError(relationResult.error)) {
				const errorMsg = `Failed to create relation at ${path}: ${JSON.stringify(relationResult.error)}`;
				errors.push(errorMsg);
				return false;
			} else {
				const warningMsg = `Relation already exists, skipping creation`;
				warnings.push(warningMsg);
			}
		}

		const relationMapKey = `${subjectResourceKey}:${relationKey}:${objectResourceKey}`;
		relations.set(
			relationMapKey,
			JSON.stringify({
				subject_resource: subjectResourceKey,
				object_resource: objectResourceKey,
				key: relationKey,
				name: relationName,
				description: `${originalSubjectResource} ${relationName} ${originalObjectResource}`,
			}),
		);

		return true;
	} catch (relationError) {
		const errorMsg = `Error creating relation at ${path}: ${relationError}`;
		errors.push(errorMsg);
		return false;
	}
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

		const pathLevelRelation = typedPathItem[PERMIT_EXTENSIONS.RELATION];
		if (pathLevelRelation && typeof pathLevelRelation === 'object') {
			await processRelation(
				pathLevelRelation as RelationData,
				resources,
				relations,
				errors,
				warnings,
				createResource,
				createRelation,
				setProgress,
				'path-level',
			);
		}

		// Then check operations for relations (existing behavior)
		for (const method of HTTP_METHODS) {
			const operation = typedPathItem[method] as Operation | undefined;
			if (!operation) continue;

			// Process relation
			const relation = operation[PERMIT_EXTENSIONS.RELATION];
			if (relation && typeof relation === 'object') {
				await processRelation(
					relation as RelationData,
					resources,
					relations,
					errors,
					warnings,
					createResource,
					createRelation,
					setProgress,
					`operation-level [${method}]`,
				);
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
					const rawResource =
						derivedRoleData.resource ||
						(typedPathItem[PERMIT_EXTENSIONS.RESOURCE] as string) ||
						'';

					const resourceKey = sanitizeKey(rawResource);

					// Default relation if not specified
					const relationKey = derivedRoleData.relation || 'parent';

					try {
						// Create the derived role with the relation
						const derivedRoleRequest: DerivedRoleRequest = {
							base_role: derivedRoleData.base_role,
							derived_role: derivedRoleData.derived_role,
							resource: resourceKey,
							relation: relationKey,
						};

						const derivedRoleResult =
							await createDerivedRole(derivedRoleRequest);

						if (derivedRoleResult.error) {
							const warningMsg = `Could not create role derivation automatically: ${JSON.stringify(derivedRoleResult.error)}`;
							warnings.push(warningMsg);
						}
					} catch (innerError) {
						const warningMsg = `Could not create role derivation automatically: ${innerError}`;
						warnings.push(warningMsg);
					}
				} catch (derivedRoleError) {
					const warningMsg = `Could not set up role derivation: ${derivedRoleError}`;
					warnings.push(warningMsg);
				}
			}
		}
	}

	return context;
}
