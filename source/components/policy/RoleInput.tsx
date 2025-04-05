import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useRolesApi } from '../../hooks/useRolesApi.js';
import type { RoleDefinition } from '../../lib/policy/utils.js';

interface RoleInputProps {
	projectId: string;
	environmentId: string;
	availableActions: string[];
	onComplete: (roles: RoleDefinition[]) => void;
}

export const RoleInput: React.FC<RoleInputProps> = ({
	projectId,
	environmentId,
	availableActions,
	onComplete,
}) => {
	const [input, setInput] = useState('');
	const { getExistingRoles, status, errorMessage } = useRolesApi(
		projectId,
		environmentId,
	);

	const handleSubmit = async (value: string) => {
		// Format: roleName:description@permissions
		const roles: RoleDefinition[] = value.split(',').flatMap(roleStr => {
			const [mainPart, permissionPart] = roleStr.split('@');
			if (!mainPart) {
				console.warn(`⚠️ Skipping invalid format: ${roleStr}`);
				return [];
			}

			const [keyRaw, descriptionRaw] = mainPart.split(':').map(s => s.trim());
			const key = keyRaw?.trim();
			const description = descriptionRaw?.trim() || '';
			const permissions =
				permissionPart
					?.split('|')
					.map(p => p.trim())
					.filter(Boolean) || [];

			if (!key) {
				console.warn(`⚠️ Skipping role with missing key: ${roleStr}`);
				return [];
			}

			return [
				{
					key,
					name: key,
					description,
					permissions,
				},
			];
		});

		if (roles.length === 0) {
			console.log('⛔ No valid roles found to process.');
			return;
		}

		const existingRoles = await getExistingRoles(); // Set<string>
		const conflictingRoles = roles.filter(role => existingRoles.has(role.key));

		if (conflictingRoles.length > 0) {
			console.log(
				`🚫 Roles already exist: ${conflictingRoles.map(r => r.key).join(', ')}`,
			);
			const validRoles = roles.filter(role => !existingRoles.has(role.key));

			if (validRoles.length === 0) {
				console.log('⚠️ No new roles to create.');
				return;
			}

			console.log(
				`✅ Proceeding with: ${validRoles.map(r => r.key).join(', ')}`,
			);
			onComplete(validRoles);
		} else {
			console.log(`✅ Creating all roles: ${roles.map(r => r.key).join(', ')}`);
			onComplete(roles);
		}
	};

	return (
		<Box flexDirection="column">
			<Text>👥 Enter roles:</Text>
			<Text>Format: roleName:description@permission1|permission2</Text>
			<Text>Available actions: {availableActions.join(', ')}</Text>
			<Box>
				<Text>❯ </Text>
				<TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
			</Box>
			{status === 'processing' && <Text>Processing...</Text>}
			{errorMessage && <Text color="red">❌ {errorMessage}</Text>}
		</Box>
	);
};
