import {
	sanitizeKey,
	isDuplicateError,
	PathItem,
	Operation,
	HTTP_METHODS,
	ApiResponse,
  } from '../../../utils/openapiUtils.js';
  import {
	ERROR_CREATING_ROLE,
	ERROR_UPDATING_ROLE,
	ERROR_CREATING_RESOURCE_ROLE,
	PERMIT_EXTENSIONS,
	ProcessorContext,
	RoleWithPermissions,
  } from './openapiConstants.js';
  import { RoleResponse } from './apiTypes.js';
  
  // Define function signatures
  type GetRoleFunction = (
	role: string,
  ) => Promise<ApiResponse<RoleWithPermissions>>;
  type CreateRoleFunction = (
	key: string,
	name: string,
  ) => Promise<ApiResponse<RoleResponse>>;
  type UpdateRoleFunction = (
	key: string,
	name: string,
	permissions: string[],
  ) => Promise<ApiResponse<RoleResponse>>;
  type CreateResourceRoleFunction = (
	resource: string,
	role: string,
	name: string,
	permission: string | string[],
  ) => Promise<ApiResponse<RoleResponse>>;
  type UpdateResourceRoleFunction = (
	resource: string,
	role: string,
	permission: string | string[],
  ) => Promise<ApiResponse<RoleResponse>>;
  
  // Helper function to capitalize first letter of a string
  function capitalizeFirstLetter(str: string): string {
	if (!str) return str;
	return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  // Define updateExistingRole function before it's used
  async function updateExistingRole(
	role: string,
	permissionStr: string | undefined,
	context: ProcessorContext,
	getRole: GetRoleFunction,
	updateRole: UpdateRoleFunction,
  ) {
	const { warnings } = context;
  
	try {
	  // Get existing role to preserve permissions
	  const { data: roleObject } = await getRole(role);
  
	  // Access permissions safely from the role object
	  const existingPermissions = roleObject?.permissions || [];
	  let permissions: string[] = Array.isArray(existingPermissions)
		? existingPermissions
		: [];
  
	  // Add the new permission if it doesn't already exist
	  if (permissionStr && !permissions.includes(permissionStr)) {
		permissions = [...permissions, permissionStr];
		
		// Log the permission being added for debugging
		console.log(`Adding permission ${permissionStr} to role ${role}`);
	  }
  
	  // Update the role with the new permissions
	  const updateResult = await updateRole(role, role, permissions);
	  if (updateResult.error) {
		warnings.push(
		  `${ERROR_UPDATING_ROLE} ${role}: ${JSON.stringify(updateResult.error)}`,
		);
	  }
	} catch (getRoleError) {
	  warnings.push(`Failed to get role details for ${role}: ${getRoleError}`);
	}
  }
  
  export async function processRoles(
	context: ProcessorContext,
	pathItems: Record<string, PathItem>,
	getRole: GetRoleFunction,
	createRole: CreateRoleFunction,
	updateRole: UpdateRoleFunction,
  ) {
	const { roles, existingRoles, errors } = context;
  
	// First, process all top-level roles to ensure they exist
	for (const [, pathItem] of Object.entries(pathItems || {})) {
	  if (!pathItem || typeof pathItem !== 'object') continue;
  
	  const typedPathItem = pathItem as PathItem;
  
	  // Process HTTP methods for roles
	  for (const method of HTTP_METHODS) {
		const operation = typedPathItem[method] as Operation | undefined;
		if (!operation) continue;
  
		// Create/update role if specified and not already processed
		const role = operation[PERMIT_EXTENSIONS.ROLE];
		if (role && typeof role === 'string' && !roles.has(role)) {
		  // Capitalize role name for display consistency
		  const displayName = capitalizeFirstLetter(role);
		  
		  // Check if role already exists
		  const roleExists = existingRoles.some(r => r.key === role);
  
		  if (!roleExists) {
			try {
			  const result = await createRole(role, displayName);
			  if (result.error && !isDuplicateError(result.error)) {
				errors.push(
				  `${ERROR_CREATING_ROLE} ${role}: ${JSON.stringify(result.error)}`,
				);
			  }
			} catch (roleError) {
			  errors.push(`Error creating role ${role}: ${roleError}`);
			}
		  }
		  roles.add(role);
		} else if (role && Array.isArray(role)) {
		  // Handle array of roles
		  for (const singleRole of role) {
			if (typeof singleRole === 'string' && !roles.has(singleRole)) {
			  // Capitalize role name for display consistency
			  const displayName = capitalizeFirstLetter(singleRole);
			  
			  // Check if role already exists
			  const roleExists = existingRoles.some(r => r.key === singleRole);
  
			  if (!roleExists) {
				try {
				  const result = await createRole(singleRole, displayName);
				  if (result.error && !isDuplicateError(result.error)) {
					errors.push(
					  `${ERROR_CREATING_ROLE} ${singleRole}: ${JSON.stringify(result.error)}`,
					);
				  }
				} catch (roleError) {
				  errors.push(`Error creating role ${singleRole}: ${roleError}`);
				}
			  }
			  roles.add(singleRole);
			}
		  }
		}
	  }
	}
  
	// Now assign permissions to all roles
	for (const [, pathItem] of Object.entries(pathItems || {})) {
	  if (!pathItem || typeof pathItem !== 'object') continue;
  
	  const typedPathItem = pathItem as PathItem;
	  
	  // Get both the original resource name and the sanitized key
	  const originalResource = typedPathItem[PERMIT_EXTENSIONS.RESOURCE] as string;
	  const resource = sanitizeKey(originalResource || '');
  
	  // Skip if no resource defined
	  if (!resource) continue;
  
	  // Process HTTP methods to assign permissions
	  for (const method of HTTP_METHODS) {
		const operation = typedPathItem[method] as Operation | undefined;
		if (!operation) continue;
  
		// Get the operation's action for permissions
		const action = operation[PERMIT_EXTENSIONS.ACTION] || method;
  
		// Create permission string if resource and action exist
		const permissionStr = resource && action ? `${resource}:${action}` : undefined;
		if (!permissionStr) continue;
  
		// Assign permission to roles specified by this operation
		const role = operation[PERMIT_EXTENSIONS.ROLE];
		if (role && typeof role === 'string') {
		  await updateExistingRole(
			role,
			permissionStr,
			context,
			getRole,
			updateRole,
		  );
		}
		
		// Handle array of roles if specified that way
		if (role && Array.isArray(role)) {
		  for (const singleRole of role) {
			if (typeof singleRole === 'string') {
			  await updateExistingRole(
				singleRole,
				permissionStr,
				context,
				getRole,
				updateRole,
			  );
			}
		  }
		}
	  }
	}
  
	return context;
  }
  
  // Updated to ensure consistent permissions handling
  async function updateResourceRolePermission(
	resource: string,
	roleKey: string,
	permissionStr: string | string[],
	context: ProcessorContext,
	updateResourceRole: UpdateResourceRoleFunction,
  ) {
	const { warnings } = context;
	try {
	  // Convert to array if it's a single string
	  const permissionsArray = Array.isArray(permissionStr) ? permissionStr : [permissionStr];
	  
	  // Process each permission
	  const processedPermissions = permissionsArray.map(perm => {
		// Check if the permission already has the resource prefix
		// to avoid creating duplicate prefixes like "resource:resource:action"
		return perm.startsWith(`${resource}:`) ? perm : `${resource}:${perm}`;
	  });
	  
	  // Log for debugging
	  console.log(`Adding permissions [${processedPermissions.join(', ')}] to resource role ${roleKey}`);
	  
	  // Call the update function with all processed permissions
	  const result = await updateResourceRole(resource, roleKey, processedPermissions);
	  if (result.error) {
		warnings.push(`Failed to update resource role ${roleKey}: ${JSON.stringify(result.error)}`);
	  }
	} catch (error) {
	  warnings.push(`Error updating resource role ${roleKey}: ${error}`);
	}
  }
  
  export async function processResourceRoles(
	context: ProcessorContext,
	pathItems: Record<string, PathItem>,
	createResourceRole: CreateResourceRoleFunction,
	updateResourceRole: UpdateResourceRoleFunction,
  ) {
	const { resourceRoles, errors, warnings } = context;
  
	// First, identify all resources and their roles
	const resourceRoleMap = new Map<string, Set<string>>();
	const resourceActionMap = new Map<string, Set<string>>();
	
	// Pre-process to collect all resource roles and their actions
	for (const [, pathItem] of Object.entries(pathItems || {})) {
	  if (!pathItem || typeof pathItem !== 'object') continue;
  
	  const typedPathItem = pathItem as PathItem;
	  const rawResource = typedPathItem[PERMIT_EXTENSIONS.RESOURCE];
	  if (!rawResource) continue;
	  
	  const resource = sanitizeKey(rawResource as string);
	  
	  // Initialize resource sets if not already done
	  if (!resourceRoleMap.has(resource)) {
		resourceRoleMap.set(resource, new Set<string>());
	  }
	  if (!resourceActionMap.has(resource)) {
		resourceActionMap.set(resource, new Set<string>());
	  }
  
	  // Process HTTP methods
	  for (const method of HTTP_METHODS) {
		const operation = typedPathItem[method] as Operation | undefined;
		if (!operation) continue;
  
		// Add action to resource actions
		const action = operation[PERMIT_EXTENSIONS.ACTION] || method;
		resourceActionMap.get(resource)?.add(action.toString());
  
		// Collect resource roles
		const resourceRole = operation[PERMIT_EXTENSIONS.RESOURCE_ROLE];
		if (resourceRole) {
		  resourceRoleMap.get(resource)?.add(resourceRole.toString());
		}
	  }
	}
  
	// Now create and assign permissions to all resource roles
	for (const [, pathItem] of Object.entries(pathItems || {})) {
	  if (!pathItem || typeof pathItem !== 'object') continue;
  
	  const typedPathItem = pathItem as PathItem;
	  const rawResource = typedPathItem[PERMIT_EXTENSIONS.RESOURCE];
	  if (!rawResource) continue;
  
	  // Store original resource name and sanitized key
	  const originalResourceName = rawResource as string;
	  const resource = sanitizeKey(originalResourceName);
  
	  // Process HTTP methods to find resource roles
	  for (const method of HTTP_METHODS) {
		const operation = typedPathItem[method] as Operation | undefined;
		if (!operation) continue;
  
		// Process resource roles
		const resourceRole = operation[PERMIT_EXTENSIONS.RESOURCE_ROLE];
		if (!resourceRole) continue;
		
		// Properly format the role names
		const roleBaseName = resourceRole.toString();
		
		// Consistent capitalization for both resource and role
		const displayResource = capitalizeFirstLetter(originalResourceName);
		const displayRole = capitalizeFirstLetter(roleBaseName);
		
		// Create display name with proper format "Resource#Role"
		const roleDisplayName = `${displayResource}#${displayRole}`;
		
		// Use a consistent tracking key
		const roleMapKey = `${resource}:${roleBaseName}`;
		
		// Only process each role once
		if (!resourceRoles.has(roleMapKey)) {
		  try {
			// Get all actions for this resource
			const resourceActions = Array.from(resourceActionMap.get(resource) || []);
			
			// Get current action for this operation
			const currentAction = operation[PERMIT_EXTENSIONS.ACTION] || method;
			
			// For initial creation, use the current action
			// For comprehensive permissions, we'll update with all actions after creation
			const initialPermission = currentAction.toString();
			
			// Create the resource role with proper naming
			const result = await createResourceRole(
			  resource,
			  roleBaseName,  // Key for API operations
			  roleDisplayName,  // Display name for UI
			  initialPermission
			);
  
			if (result.error) {
			  if (!isDuplicateError(result.error)) {
				errors.push(
				  `${ERROR_CREATING_RESOURCE_ROLE} ${roleDisplayName}: ${JSON.stringify(result.error)}`,
				);
			  } else {
				warnings.push(
				  `Resource role ${roleDisplayName} already exists, updating permissions...`,
				);
				
				// Add all resource actions to this role
				if (resourceActions.length > 0) {
				  await updateResourceRolePermission(
					resource,
					roleBaseName,
					resourceActions,
					context,
					updateResourceRole,
				  );
				}
			  }
			} else {
			  // Role created successfully, now add all actions if there are more than one
			  if (resourceActions.length > 1) {
				await updateResourceRolePermission(
				  resource,
				  roleBaseName,
				  resourceActions,
				  context,
				  updateResourceRole,
				);
			  }
			}
			
			resourceRoles.set(roleMapKey, true);
		  } catch (resourceRoleError) {
			errors.push(
			  `Error creating resource role ${roleDisplayName}: ${resourceRoleError}`,
			);
		  }
		}
	  }
	}
  
	return context;
  }