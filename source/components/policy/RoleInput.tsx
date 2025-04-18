import React, { useState, useMemo } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useRolesApi } from '../../hooks/useRolesApi.js';
import { components } from '../../lib/api/v1.js';

interface RoleInputProps {
	availableActions: string[];
	availableResources: string[];
	onComplete: (roles: components['schemas']['RoleCreate'][]) => void;
	onError: (error: string) => void;
}

export const RoleInput: React.FC<RoleInputProps> = ({
	availableActions,
	availableResources,
	onComplete,
	onError,
}) => {
	const [input, setInput] = useState('');
	const { getExistingRoles, status } = useRolesApi();

	// Improved placeholder: a real, clear example
	const placeholder = useMemo(() => {
		if (availableResources.length === 0) return 'admin|resource';
		if (availableActions.length === 0) return `admin|${availableResources[0]}`;
		return `admin|${availableResources[0]}:${availableActions[0]}|${availableResources[0]}`;
	}, [availableResources, availableActions]);

	const validateRoleKey = (key: string): boolean =>
		/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key);

	const validateResource = (resource: string): boolean =>
		!!resource && availableResources.includes(resource);

	const validateAction = (action: string): boolean =>
		!!action && availableActions.includes(action);

	// Improved handleSubmit: first Enter fills input, second Enter submits
	const handleSubmit = async (value: string) => {
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

			for (const def of roleDefs) {
				const [role, ...permParts] = def.split('|').map(s => s.trim());
				if (!role || !validateRoleKey(role)) {
					onError(`Invalid role key: ${role}`);
					return;
				}
				if (existingRolesSet && existingRolesSet.has(role)) {
					onError(`Role "${role}" already exists`);
					return;
				}
				if (permParts.length === 0) {
					onError('Role must have at least one resource or resource:action');
					return;
				}

				const permissions: string[] = [];
				for (const perm of permParts) {
					const [resource, action] = perm.split(':').map(s => s.trim());
					if (!resource || !validateResource(resource)) {
						onError(`Invalid resource in permission: ${perm}`);
						return;
					}
					if (!action) {
						permissions.push(...availableActions.map(a => `${resource}:${a}`));
					} else {
						if (!validateAction(action)) {
							onError(`Invalid action in permission: ${perm}`);
							return;
						}
						permissions.push(`${resource}:${action}`);
					}
				}

				if (permissions.length === 0) {
					onError(`No valid permissions for role: ${role}`);
					return;
				}

				roles.push({
					key: role,
					name: role,
					permissions,
				});
			}

			onComplete(roles);
			setInput('');
		} catch (err) {
			onError((err as Error).message);
		}
	};

	return (
		<Box flexDirection="column" gap={1}>
			<Box>
				<Text bold>Role Configuration</Text>
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
					Enter roles in the format:{' '}
					<Text color="cyan">role|resource:action|resource:action</Text> or{' '}
					<Text color="cyan">role|resource</Text>
				</Text>
			</Box>
			<Box>
				<Text dimColor>
					Example: <Text color="yellow">{placeholder}</Text>
				</Text>
			</Box>
			<Box>
				<Text>{'> '}</Text>
				<TextInput
					value={input}
					onChange={setInput}
					onSubmit={handleSubmit}
					placeholder={placeholder}
				/>
			</Box>
			{status === 'processing' && <Text>Validating roles...</Text>}
		</Box>
	);
};
