import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useRolesApi } from '../../hooks/useRolesApi.js';
import type { RoleDefinition } from '../../lib/policy/utils.js';

interface RoleInputProps {
	projectId: string;
	environmentId: string;
	apiKey?: string;
	availableActions: string[];
	availableResources: string[];
	onComplete: (roles: RoleDefinition[]) => void;
	onError: (error: string) => void;
}

export const RoleInput: React.FC<RoleInputProps> = ({
	projectId,
	environmentId,
	apiKey,
	availableActions,
	availableResources,
	onComplete,
	onError,
}) => {
	const [input, setInput] = useState('');
	const { getExistingRoles, status } = useRolesApi(
		projectId,
		environmentId,
		apiKey,
	);

	const validateRoleKey = (key: string): boolean => {
		return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key);
	};

	const validatePermission = (permission: string): boolean => {
		const trimmedPermission = permission.trim();

		// Handle full wildcard
		if (trimmedPermission === '*:*') return true;

		const [resource, action] = trimmedPermission.split(':').map(p => p.trim());

		// Both parts must exist
		if (!resource || !action) return false;

		// Handle wildcard resource with specific action
		if (resource === '*') {
			return availableActions.includes(action);
		}

		// Handle specific resource with wildcard action
		if (action === '*') {
			return availableResources.includes(resource);
		}

		// Handle specific resource and action
		return (
			availableResources.includes(resource) && availableActions.includes(action)
		);
	};

	const handleSubmit = async (value: string) => {
		try {
			// Trim entire input and split by comma
			const roleInputs = value
				.trim()
				.split(',')
				.map(r => r.trim())
				.filter(Boolean);

			if (roleInputs.length === 0) {
				onError('Please enter at least one role');
				return;
			}

			const roles: RoleDefinition[] = roleInputs.map(roleStr => {
				// Split and trim main part and permissions part
				const [mainPart, permissionPart] = roleStr
					.split('@')
					.map(s => s.trim());

				if (!mainPart) {
					throw new Error('Invalid role format');
				}

				// Split and trim key and description
				const [key, description] = mainPart.split(':').map(s => s.trim());

				if (!key || !validateRoleKey(key)) {
					throw new Error(`Invalid role key: ${key}`);
				}

				// Process and trim permissions
				const permissions = permissionPart
					?.split('|')
					.map(p => p.trim())
					.filter(Boolean);

				if (permissions && permissions.length > 0) {
					const invalidPerms = permissions.filter(
						p => !validatePermission(p.trim()),
					);
					if (invalidPerms.length > 0) {
						throw new Error(
							`Invalid permissions for role ${key}: ${invalidPerms.join(', ')}\n` +
								`Available resources: ${availableResources.join(', ')}\n` +
								`Available actions: ${availableActions.join(', ')}`,
						);
					}
				}

				return {
					key,
					name: key,
					description: description || undefined,
					permissions: permissions?.length ? permissions : undefined,
				};
			});

			// Check for existing roles
			const existingRoles = await getExistingRoles();
			const conflictingRoles = roles.filter(role =>
				existingRoles.has(role.key),
			);

			if (conflictingRoles.length > 0) {
				onError(
					`Roles already exist: ${conflictingRoles.map(r => r.key).join(', ')}`,
				);
				return;
			}

			onComplete(roles);
			setInput(''); // Clear input after successful submission
		} catch (err) {
			onError((err as Error).message);
		}
	};

	return (
		<Box flexDirection="column" gap={1}>
			<Box>
				<Text bold>Role Configuration</Text>
			</Box>
			<Box flexDirection="column">
				<Text>Format: name:description@permission1|permission2</Text>
				<Text>Permissions format: resource:action</Text>
				<Text>Use * for wildcards (e.g., *:* or users:* or *:read)</Text>
			</Box>
			<Box flexDirection="column">
				<Text>Available resources: {availableResources.join(', ')}</Text>
				<Text>Available actions: {availableActions.join(', ')}</Text>
			</Box>
			<Box flexDirection="column">
				<Text>Examples:</Text>
				<Text>editor:Content Editor@posts:create|posts:update</Text>
			</Box>
			<Box>
				<Text>{'> '}</Text>
				<TextInput
					value={input}
					onChange={setInput}
					onSubmit={handleSubmit}
					placeholder="editor:Content Editor@posts:create|posts:update"
				/>
			</Box>
			{status === 'processing' && <Text>Validating roles...</Text>}
		</Box>
	);
};
