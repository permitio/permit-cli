import { useCallback } from 'react';
import path from 'node:path';
import SwaggerParser from '@apidevtools/swagger-parser';
import { useOpenapiApi } from './useOpenapiApi.js';
import { OpenApiDocument, ApiResponse } from '../../utils/openapiUtils.js';
import {
  ProcessorProps,
  ProcessorContext,
  RoleWithPermissions,
  ResourceResponse,
  ActionResponse,
  RoleResponse,
  RelationResponse,
  RelationRequest,
  DerivedRoleResponse,
  DerivedRoleRequest,
  UrlMappingResponse,
  UrlMappingRequest,
  processResources,
  processRoles,
  processResourceRoles,
  processRelations,
  processDerivedRoles,
  generateUrlMappings,
  createMappings,
} from './process/openapiProcessorExports.js';

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
    updateResourceRole,
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

      // Create context for processing
      const context: ProcessorContext = {
        resources: new Set<string>(),
        actions: new Map<string, Set<string>>(),
        roles: new Set<string>(),
        resourceRoles: new Map<string, boolean>(),
        relations: new Map<string, string>(),
        mappings: [],
        errors: [],
        warnings: [],
        existingResources: [],
        existingRoles: [],
        baseUrl,
      };

      // List existing resources and roles to avoid conflicts
      try {
        const response = await listResources();
        if (response && response.data) {
          if (Array.isArray(response.data)) {
            context.existingResources = response.data;
          } 
          // If data has a nested data property that's an array, use that
          else if (response.data && typeof response.data === 'object' && 'data' in response.data && Array.isArray(response.data.data)) {
            context.existingResources = response.data.data;
          }
        }
      } catch (error) {
        console.log('Error fetching resources:', error);
        // Continue with empty resources array if fetching fails
      }

      try {
        const response = await listRoles();
        if (response && response.data) {
          if (Array.isArray(response.data)) {
            context.existingRoles = response.data;
          } 
          // If data has a nested data property that's an array, use that
          else if (response.data && typeof response.data === 'object' && 'data' in response.data && Array.isArray(response.data.data)) {
            context.existingRoles = response.data.data;
          }
        }
      } catch (error) {
        console.log('Error fetching roles:', error);
        // Continue with empty roles array if fetching fails
      }

      // Process each stage in sequence
      setProgress('Processing OpenAPI extensions...');
      await processResources(
        context,
        parsedSpec.paths || {},
        createResource as (
          key: string,
          name: string,
        ) => Promise<ApiResponse<ResourceResponse>>,
        updateResource as (
          key: string,
          name: string,
        ) => Promise<ApiResponse<ResourceResponse>>,
        createAction as (
          resource: string,
          action: string,
          description: string,
        ) => Promise<ApiResponse<ActionResponse>>,
      );

      setProgress('Creating roles and permissions...');
      await processRoles(
        context,
        parsedSpec.paths || {},
        getRole as (role: string) => Promise<ApiResponse<RoleWithPermissions>>,
        createRole as (
          key: string,
          name: string,
        ) => Promise<ApiResponse<RoleResponse>>,
        updateRole as (
          key: string,
          name: string,
          permissions: string[],
        ) => Promise<ApiResponse<RoleResponse>>,
      );

      setProgress('Creating relations between resources...');
      await processRelations(
        context,
        parsedSpec.paths || {},
        createResource as (
          key: string,
          name: string,
        ) => Promise<ApiResponse<ResourceResponse>>,
        createRelation as (
          relationData: RelationRequest,
        ) => Promise<ApiResponse<RelationResponse>>,
        setProgress,
      );

      setProgress('Creating role derivations and resource-specific roles...');
      await processResourceRoles(
        context,
        parsedSpec.paths || {},
        createResourceRole as (
          resource: string,
          role: string,
          name: string,
          permission: string | string[],
        ) => Promise<ApiResponse<RoleResponse>>,
        updateResourceRole as (
          resource: string,
          role: string,
          permission: string | string[],
        ) => Promise<ApiResponse<RoleResponse>>,
      );

      await processDerivedRoles(
        context,
        parsedSpec.paths || {},
        createDerivedRole as (
          derivedRoleData: DerivedRoleRequest,
        ) => Promise<ApiResponse<DerivedRoleResponse>>,
      );

      await generateUrlMappings(context, parsedSpec.paths || {});

      setProgress('Creating URL mappings...');
      await createMappings(
        context,
        ((source: string) => deleteUrlMappings(source)) as unknown as (
          source: string,
        ) => Promise<ApiResponse<Record<string, unknown>>>,
        ((
          mappings: UrlMappingRequest[],
          authType: string,
          tokenHeader: string,
        ) => {
          // Define allowed HTTP methods type
          type HttpMethod =
            | 'get'
            | 'put'
            | 'post'
            | 'delete'
            | 'options'
            | 'head'
            | 'patch';

          // Use type from components schema with proper constraints
          type MappingRuleWithHeaders = {
            url: string;
            http_method: HttpMethod;
            resource: string;
            headers: Record<string, string>;
            action?: string;
            url_type?: 'regex';
          };

          // Convert the UrlMappingRequest[] to MappingRule[]
          const adaptedMappings = mappings.map(mapping => {
            // Normalize http_method to ensure it matches the allowed values
            const httpMethod = mapping.http_method.toLowerCase() as HttpMethod;

            // Validate http_method is one of the allowed values
            if (
              ![
                'get',
                'put',
                'post',
                'delete',
                'options',
                'head',
                'patch',
              ].includes(httpMethod)
            ) {
              throw new Error(
                `Invalid HTTP method: ${mapping.http_method}. Must be one of: get, put, post, delete, options, head, patch`,
              );
            }

            // Create properly typed object
            const result: MappingRuleWithHeaders = {
              url: mapping.url,
              http_method: httpMethod,
              resource: mapping.resource,
              headers: {}, // Empty headers object as required by API
            };

            // Add optional properties if they exist
            if (mapping.action) result.action = mapping.action;

            
            if ('urlType' in mapping && mapping.urlType === 'regex') {
              result.url_type = 'regex';
            }

            return result;
          });

          return createUrlMappings(adaptedMappings, authType, tokenHeader);
        }) as unknown as (
          mappings: UrlMappingRequest[],
          authType: string,
          tokenHeader: string,
        ) => Promise<ApiResponse<UrlMappingResponse[]>>,
      );

      // Check if there were any errors
      if (context.errors.length > 0) {
        setError(
          `Completed with ${context.errors.length} errors. Last error: ${context.errors[context.errors.length - 1]}`,
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
    updateResourceRole,
  ]);

  return { processSpec };
};