import {
	sanitizeKey,
	isDuplicateError,
	PathItem,
	Operation,
	HTTP_METHODS,
	ApiResponse,
} from '../../../utils/openapiUtils.js';
import {
	ERROR_CREATING_RESOURCE,
	PERMIT_EXTENSIONS,
	ProcessorContext,
} from './openapiConstants.js';
import { ResourceResponse, ActionResponse } from './apiTypes.js';

// Define function type for processActions to avoid using it before definition
type CreateResourceFunction = (
	key: string,
	name: string,
) => Promise<ApiResponse<ResourceResponse>>;
type UpdateResourceFunction = (
	key: string,
	name: string,
) => Promise<ApiResponse<ResourceResponse>>;
type CreateActionFunction = (
	resource: string,
	action: string,
	description: string,
) => Promise<ApiResponse<ActionResponse>>;

type ProcessActionsFunction = (
	pathItem: PathItem,
	resource: string,
	context: ProcessorContext,
	createAction: CreateActionFunction,
) => Promise<void>;

// Define the processActions function implementation
const processActions: ProcessActionsFunction = async (
	pathItem: PathItem,
	resource: string,
	context: ProcessorContext,
	createAction,
) => {
	const { actions, errors } = context;

	for (const method of HTTP_METHODS) {
		const operation = pathItem[method] as Operation | undefined;
		if (!operation) continue;

		// Get action from x-permit-action or default to HTTP method
		const action = operation[PERMIT_EXTENSIONS.ACTION] || method;

		// Create action if needed
		const resourceActions = actions.get(resource);
		if (resourceActions && !resourceActions.has(action as string)) {
			try {
				const result = await createAction(
					resource,
					action as string,
					action as string,
				);
				if (result.error) {
					if (!isDuplicateError(result.error)) {
						errors.push(
							`Failed to create action ${action}: ${JSON.stringify(result.error)}`,
						);
					}
				}
				resourceActions.add(action as string);
			} catch (actionError) {
				errors.push(`Error creating action ${action}: ${actionError}`);
			}
		}
	}
};

export async function processResources(
	context: ProcessorContext,
	pathItems: Record<string, PathItem>,
	createResource: CreateResourceFunction,
	updateResource: UpdateResourceFunction,
	createAction: CreateActionFunction,
) {
	const { resources, actions, errors, warnings, existingResources } = context;

	for (const [, pathItem] of Object.entries(pathItems || {})) {
		if (!pathItem || typeof pathItem !== 'object') continue;

		const typedPathItem = pathItem as PathItem;

		const rawResource = typedPathItem[PERMIT_EXTENSIONS.RESOURCE];
		if (!rawResource) continue;

		// Sanitize resource key
		const resource = sanitizeKey(rawResource as string);

		// Create or update resource
		if (!resources.has(resource)) {
			// Check if resource already exists
			const resourceExists = existingResources.some(r => r.key === resource);

			if (!resourceExists) {
				try {
					const result = await createResource(resource, rawResource as string);
					if (result.error) {
						if (!isDuplicateError(result.error)) {
							errors.push(
								`${ERROR_CREATING_RESOURCE} ${resource}: ${JSON.stringify(result.error)}`,
							);
						} else {
							await updateResource(resource, rawResource as string);
						}
					}
				} catch (resourceError) {
					errors.push(`Error creating resource ${resource}: ${resourceError}`);
				}
			} else {
				try {
					await updateResource(resource, rawResource as string);
				} catch (updateError) {
					warnings.push(`Error updating resource ${resource}: ${updateError}`);
				}
			}

			resources.add(resource);
			actions.set(resource, new Set());
		}

		// Process actions for this resource
		await processActions(typedPathItem, resource, context, createAction);
	}

	return context;
}
