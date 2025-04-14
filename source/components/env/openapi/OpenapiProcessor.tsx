import { useCallback } from 'react';
import path from 'node:path';
import SwaggerParser from '@apidevtools/swagger-parser';
import { useOpenapiApi } from '../../../hooks/openapi/useOpenapiApi.js';
import { 
  OpenApiDocument, 
  PathItem, 
  Operation, 
  HTTP_METHODS,
  sanitizeKey, 
  isDuplicateError,
  UrlMapping
} from '../../../utils/openapiUtils.js';

interface ProcessorProps {
  inputPath: string;
  setProgress: (message: string) => void;
  setStatus: (status: 'loading' | 'error' | 'success') => void;
  setError: (error: string | null) => void;
  setProcessingDone: (done: boolean) => void;
}

/**
 * Hook that contains the OpenAPI processing logic
 */
export const useOpenapiProcessor = ({
  inputPath,
  setProgress,
  setStatus,
  setError,
  setProcessingDone,
}: ProcessorProps) => {
  // Import all API hooks through the main API hook
  const {
    listResources,
    createResource,
    updateResource,
    createAction,
    listRoles,
    getRole,
    createRole,
    updateRole,
    createResourceRole,
    createRelation,
    createDerivedRole,
    deleteUrlMappings,
    createUrlMappings,
  } = useOpenapiApi();

  // Process the OpenAPI spec file
  const processSpec = useCallback(async () => {
    try {
      // Normalize the path
      const normalizedPath = inputPath.startsWith('http')
        ? inputPath
        : path.resolve(process.cwd(), inputPath);

      setProgress('Loading and validating OpenAPI spec...');

      // Use swagger-parser to parse and validate the spec
      let parsedSpec: OpenApiDocument;
      try {
        // Parse and validate the OpenAPI spec
        parsedSpec = (await SwaggerParser.validate(
          normalizedPath,
        )) as OpenApiDocument;
      } catch (parseError) {
        throw new Error(
          `Failed to parse or validate OpenAPI spec: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        );
      }

      // Get the base URL from the servers section if available
      const baseUrl =
        parsedSpec.servers &&
        parsedSpec.servers.length > 0 &&
        parsedSpec.servers[0] !== undefined
          ? parsedSpec.servers[0].url
          : '';

      // Track created entities and errors
      const resources = new Set<string>();
      const actions = new Map<string, Set<string>>();
      const roles = new Set<string>();
      const resourceRoles = new Map<string, boolean>();
      const relations = new Map<string, string>(); // Map relation key to JSON string of relation object
      const mappings: UrlMapping[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];

      // List existing resources and roles to avoid conflicts
      let existingResources: Array<{ key: string }> = [];
      let existingRoles: Array<{ key: string }> = [];

      try {
        const { data: resourcesData } = await listResources();
        if (resourcesData?.data) {
          // Type assertion to ensure proper typing
          existingResources = resourcesData.data as Array<{ key: string }>;
        }
      } catch (_) {
        // Silently continue if we can't get existing resources
      }

      try {
        const { data: rolesData } = await listRoles();
        if (rolesData?.data) {
          // Type assertion to ensure proper typing
          existingRoles = rolesData.data as Array<{ key: string }>;
        }
      } catch (_) {
        // Silently continue if we can't get existing roles
      }

      setProgress('Processing OpenAPI extensions...');

      // Create/update all resources and actions
      for (const [, pathItem] of Object.entries(parsedSpec.paths || {})) {
        if (!pathItem || typeof pathItem !== 'object') continue;

        // Cast to our PathItem type with extensions
        const typedPathItem = pathItem as PathItem;

        const rawResource = typedPathItem['x-permit-resource'];
        if (!rawResource) continue;

        // Sanitize resource key
        const resource = sanitizeKey(rawResource as string);

        // Create or update resource
        if (!resources.has(resource)) {
          // Check if resource already exists
          const resourceExists = existingResources.some(
            r => r.key === resource,
          );

          if (!resourceExists) {
            try {
              const result = await createResource(
                resource,
                rawResource as string,
              );
              if (result.error) {
                if (!isDuplicateError(result.error)) {
                  errors.push(
                    `Failed to create resource ${resource}: ${JSON.stringify(result.error)}`,
                  );
                } else {
                  await updateResource(resource, rawResource as string);
                }
              }
            } catch (resourceError) {
              errors.push(
                `Error creating resource ${resource}: ${resourceError}`,
              );
            }
          } else {
            try {
              await updateResource(resource, rawResource as string);
            } catch (updateError) {
              warnings.push(
                `Error updating resource ${resource}: ${updateError}`,
              );
            }
          }

          resources.add(resource);
          actions.set(resource, new Set());
        }

        // Process HTTP methods to create actions
        for (const method of HTTP_METHODS) {
          const operation = typedPathItem[method] as Operation | undefined;
          if (!operation) continue;

          // Get action from x-permit-action or default to HTTP method
          const action = operation['x-permit-action'] || method;

          // Create action if needed
          const resourceActions = actions.get(resource);
          if (resourceActions && !resourceActions.has(action as string)) {
            try {
              const result = await createAction(
                resource, 
                action as string, 
                action as string
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
      }

      //  Create/update all roles
      setProgress('Creating roles and permissions...');

      for (const [, pathItem] of Object.entries(parsedSpec.paths || {})) {
        if (!pathItem || typeof pathItem !== 'object') continue;

        // Cast to our PathItem type with extensions
        const typedPathItem = pathItem as PathItem;

        // Process HTTP methods for roles
        for (const method of HTTP_METHODS) {
          const operation = typedPathItem[method] as Operation | undefined;
          if (!operation) continue;

          // Create/update role if specified and not already processed
          const role = operation['x-permit-role'];
          if (role && !roles.has(role as string)) {
            // Check if role already exists
            const roleExists = existingRoles.some(r => r.key === role);

            // Get the operation's resource and action for permissions
            const resource = sanitizeKey(
              (typedPathItem['x-permit-resource'] as string) || '',
            );
            const action = operation['x-permit-action'] || method;

            // Create permission string if resource and action exist
            const permissionStr =
              resource && action ? `${resource}:${action}` : undefined;

            if (!roleExists) {
              try {
                const result = await createRole(role as string, role as string);
                if (result.error) {
                  if (!isDuplicateError(result.error)) {
                    errors.push(
                      `Failed to create role ${role}: ${JSON.stringify(result.error)}`,
                    );
                  } else {
                    // Role exists but wasn't in our list, try to update it
                    try {
                      // Get existing role to preserve permissions
                      const { data: existingRole } = await getRole(role as string);

                      // Get existing permissions and add the new one if not already present
                      const existingPermissions =
                        existingRole?.['permissions'] || [];
                      let permissions: string[] = Array.isArray(
                        existingPermissions,
                      )
                        ? existingPermissions
                        : [];

                      if (
                        permissionStr &&
                        !permissions.includes(permissionStr)
                      ) {
                        permissions = [...permissions, permissionStr];
                      }

                      // Update the role with the new permissions
                      const updateResult = await updateRole(
                        role as string,
                        role as string,
                        permissions,
                      );
                      if (updateResult.error) {
                        warnings.push(
                          `Failed to update role ${role}: ${JSON.stringify(updateResult.error)}`,
                        );
                      }
                    } catch (getRoleError) {
                      warnings.push(
                        `Failed to get role details for ${role}: ${getRoleError}`,
                      );
                    }
                  }
                } else {
                  // If we have a permission to add, update the role with it
                  if (permissionStr) {
                    try {
                      await updateRole(role as string, role as string, [permissionStr]);
                    } catch (updateError) {
                      warnings.push(
                        `Failed to add permission to role ${role}: ${updateError}`,
                      );
                    }
                  }
                }
              } catch (roleError) {
                errors.push(`Error creating role ${role}: ${roleError}`);
              }
            } else {
              try {
                // Get existing role to preserve permissions
                const { data: existingRole } = await getRole(role as string);

                // Get existing permissions and add the new one if not already present
                const existingPermissions = existingRole?.['permissions'] || [];
                let permissions: string[] = Array.isArray(existingPermissions)
                  ? existingPermissions
                  : [];

                if (permissionStr && !permissions.includes(permissionStr)) {
                  permissions = [...permissions, permissionStr];
                }

                // Update the role with the new permissions
                const updateResult = await updateRole(
                  role as string,
                  role as string,
                  permissions,
                );
                if (updateResult.error) {
                  warnings.push(
                    `Failed to update role ${role}: ${JSON.stringify(updateResult.error)}`,
                  );
                }
              } catch (getRoleError) {
                warnings.push(
                  `Failed to get role details for ${role}: ${getRoleError}`,
                );
              }
            }

            roles.add(role as string);
          }
        }
      }

      // Create relations
      setProgress('Creating relations between resources...');

      for (const [, pathItem] of Object.entries(parsedSpec.paths || {})) {
        if (!pathItem || typeof pathItem !== 'object') continue;

        // Cast to our PathItem type with extensions
        const typedPathItem = pathItem as PathItem;

        const rawResource = typedPathItem['x-permit-resource'];
        if (!rawResource) continue;

        // Process HTTP methods
        for (const method of HTTP_METHODS) {
          const operation = typedPathItem[method] as Operation | undefined;
          if (!operation) continue;

          // Process relation
          const relation = operation['x-permit-relation'];
          if (relation && typeof relation === 'object') {
            try {
              type RelationData = {
                subject_resource: string;
                object_resource: string;
                key?: string;
                name?: string;
              };

              const relationData = relation as unknown as RelationData;

              const sanitizedRelation = {
                ...relationData,
                subject_resource: sanitizeKey(relationData.subject_resource),
                object_resource: sanitizeKey(relationData.object_resource),
                key:
                  relationData.key ||
                  `${sanitizeKey(relationData.subject_resource)}_${sanitizeKey(relationData.object_resource)}`,
                name:
                  relationData.name ||
                  `${relationData.subject_resource} to ${relationData.object_resource}`,
              };

              // First, check if both resources exist
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

              // Wait for resources to be properly registered
              await new Promise(resolve => setTimeout(resolve, 1000));

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

      // Wait for relations to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create resource roles and derived roles
      setProgress('Creating role derivations and resource-specific roles...');

      for (const [pathKey, pathItem] of Object.entries(
        parsedSpec.paths || {},
      )) {
        if (!pathItem || typeof pathItem !== 'object') continue;

        // Cast to our PathItem type with extensions
        const typedPathItem = pathItem as PathItem;

        const rawResource = typedPathItem['x-permit-resource'];
        if (!rawResource) continue;

        const resource = sanitizeKey(rawResource as string);

        // Process HTTP methods
        for (const method of HTTP_METHODS) {
          const operation = typedPathItem[method] as Operation | undefined;
          if (!operation) continue;

          // Process resource roles
          const resourceRole = operation['x-permit-resource-role'];
          if (resourceRole) {
            const sanitizedResourceRole = `${resource}_${resourceRole}`;
            if (!resourceRoles.has(sanitizedResourceRole)) {
              try {
                // Create individual permission for specific action instead of wildcard
                const action = operation['x-permit-action'] || method;
                const permissionString = `${resource}:${action}`;

                const result = await createResourceRole(
                  resource,
                  sanitizedResourceRole,
                  `${rawResource} ${resourceRole}`,
                  permissionString,
                );

                if (result.error) {
                  if (!isDuplicateError(result.error)) {
                    errors.push(
                      `Failed to create resource role ${resourceRole}: ${JSON.stringify(result.error)}`,
                    );
                  } else {
                    warnings.push(
                      `Resource role ${sanitizedResourceRole} already exists, skipping creation`,
                    );
                  }
                }
                resourceRoles.set(sanitizedResourceRole, true);
              } catch (resourceRoleError) {
                errors.push(
                  `Error creating resource role ${resourceRole}: ${resourceRoleError}`,
                );
              }
            }
          }

          // Process derived role
          const derivedRole = operation['x-permit-derived-role'];
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
                  (typedPathItem['x-permit-resource'] as string) ||
                  '',
              );

              try {
                // Create the derived role
                const derivedRoleResult = await createDerivedRole({
                  ...derivedRoleData,
                  resource: resourceKey,
                });

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

          // Add URL mapping with absolute path
          const action = operation['x-permit-action'] || method;
          mappings.push({
            url: baseUrl ? `${baseUrl}${pathKey}` : pathKey,
            http_method: method as string,
            resource: resource,
            action: action as string,
          });
        }
      }

      // Create URL mappings
      setProgress('Creating URL mappings...');
      if (mappings.length > 0) {
        try {
          // Try to delete existing mappings first
          try {
            await deleteUrlMappings('openapi');
          } catch (_) {
            // No existing mappings to delete or error deleting
          }

          const result = await createUrlMappings(
            mappings,
            'Bearer',
            'openapi_token',
          );
          if (result.error) {
            errors.push(
              `Failed to create URL mappings: ${JSON.stringify(result.error)}`,
            );
          }
        } catch (mappingError) {
          errors.push(`Error creating URL mappings: ${mappingError}`);
        }
      }

      // Check if there were any errors
      if (errors.length > 0) {
        setError(
          `Completed with ${errors.length} errors. Last error: ${errors[errors.length - 1]}`,
        );
        setStatus('error');
      } else {
        setStatus('success');
      }

      setProcessingDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
      setProcessingDone(true);
    }
  }, [
    inputPath,
    setProgress,
    setError,
    setStatus,
    setProcessingDone,
    createAction,
    createDerivedRole,
    createRelation,
    createResource,
    createResourceRole,
    createRole,
    createUrlMappings,
    deleteUrlMappings,
    getRole,
    listResources,
    listRoles,
    updateResource,
    updateRole,
  ]);

  return { processSpec };
};