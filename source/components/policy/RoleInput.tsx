import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useRolesApi } from '../../hooks/useRolesApi.js';
import { components } from '../../lib/api/v1.js';

interface RoleInputProps {
	availableActions: string[];
	availableResources: string[];
	onComplete: (roles: components['schemas']['RoleCreate'][]) => void;
}

export const RoleInput: React.FC<RoleInputProps> = ({
	availableActions,
	availableResources,
	onComplete,
}) => {
	const [input, setInput] = useState('');
	const [validationError, setValidationError] = useState<string | null>(null);
	const { getExistingRoles, status } = useRolesApi();

	// Improved placeholder: a real, clear example
	const placeholder = 'Admin|Posts, User|Posts:Read|Posts:Create';

	const validateRoleKey = (key: string): boolean =>
		/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key);

	const validateResource = (resource: string): boolean =>
		!!resource && availableResources.includes(resource);

	const validateAction = (action: string): boolean =>
		!!action && availableActions.includes(action);

	const handleSubmit = async (value: string) => {
		// Clear any previous validation errors
		setValidationError(null);

		if (value.trim() === '') {
			setInput(placeholder);
			return;
		}

		try {
			const valueToProcess = value.trim();
			const roleDefs = valueToProcess
				.split(',')
				.map(r => r.trim())
				.filter(Boolean);

			const existingRolesSet = await getExistingRoles();
			const roles: components['schemas']['RoleCreate'][] = [];
			const existingRoles: string[] = [];

			for (const def of roleDefs) {
				const [role, ...permParts] = def.split('|').map(s => s.trim());
				if (!role || !validateRoleKey(role)) {
					setValidationError(`Invalid role key: ${role}`);
					return;
				}

				// Track existing roles
				if (existingRolesSet && existingRolesSet.has(role)) {
					existingRoles.push(role);
				}

				if (permParts.length === 0) {
					setValidationError(
						'Role must have at least one resource or resource:action',
					);
					return;
				}

				const permissions: string[] = [];
				for (const perm of permParts) {
					const [resource, action] = perm.split(':').map(s => s.trim());
					if (!resource || !validateResource(resource)) {
						setValidationError(`Invalid resource in permission: ${perm}`);
						return;
					}
					if (!action) {
						permissions.push(...availableActions.map(a => `${resource}:${a}`));
					} else {
						if (!validateAction(action)) {
							setValidationError(`Invalid action in permission: ${perm}`);
							return;
						}
						permissions.push(`${resource}:${action}`);
					}
				}

				if (permissions.length === 0) {
					setValidationError(`No valid permissions for role: ${role}`);
					return;
				}

				// Only add roles that don't already exist
				if (!existingRolesSet || !existingRolesSet.has(role)) {
					roles.push({
						key: role,
						name: role,
						permissions,
					});
				}
			}

			// If there are existing roles, show error and don't proceed
			if (existingRoles.length > 0) {
				setValidationError(`Roles already exist: ${existingRoles.join(', ')}`);
				return;
			}

			// No existing roles, proceed normally
			onComplete(roles);
			setInput('');
		} catch (err) {
			setValidationError((err as Error).message);
		}
	};

	return (
		<Box flexDirection="column" gap={1}>
			<Box>
				<Text bold>Configure Roles and Permissions</Text>
			</Box>
			{availableResources.length > 0 && (
				<Box>
					<Text color="cyan">Resources: {availableResources.join(', ')}</Text>
				</Box>
			)}
			{availableActions.length > 0 && (
				<Box>
					<Text color="cyan">Actions: {availableActions.join(', ')}</Text>
				</Box>
			)}

			<Box>
				<Text>
					Roles/Permissions Convention:{' '}
					<Text color="cyan">role|resource:action|resource:action</Text> or{' '}
					<Text color="cyan">role|resource</Text>
				</Text>
			</Box>

			<Box>
				<Text dimColor>
					For Example: <Text color="yellow">{placeholder}</Text>
				</Text>
			</Box>

			<Box>
				<Text>{'> '}</Text>
				<TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
			</Box>
			{status === 'processing' && <Text>Validating roles...</Text>}
			{validationError && (
				<Box>
					<Text color="red">{validationError}</Text>
				</Box>
			)}
		</Box>
	);
};
