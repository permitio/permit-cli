import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useResourceApi } from '../../hooks/useResourceApi.js';
import type { ResourceDefinition } from '../../lib/policy/utils.js';

interface ResourceInputProps {
	projectId: string;
	environmentId: string;
	onComplete: (resources: ResourceDefinition[]) => void;
}

export const ResourceInput: React.FC<ResourceInputProps> = ({
	projectId,
	environmentId,
	onComplete,
}) => {
	const [input, setInput] = useState('');
	const { getExistingResources, status, errorMessage } = useResourceApi(
		projectId,
		environmentId,
	);

	const handleSubmit = async (value: string) => {
		const resourceKeys = value
			.split(',')
			.map(k => k.trim())
			.filter(Boolean);

		// Check for existing resources
		const existingResources = await getExistingResources();
		const conflictingResources = resourceKeys.filter(key =>
			existingResources.has(key),
		);

		if (conflictingResources.length > 0) {
			console.log(
				` Resources already exist: ${conflictingResources.join(', ')}`,
			);
			const validResources = resourceKeys.filter(
				key => !existingResources.has(key),
			);

			if (validResources.length === 0) {
				console.log(' No valid resources to create');
				return;
			}

			console.log(`✓ Proceeding with: ${validResources.join(', ')}`);

			const resources: ResourceDefinition[] = validResources.map(key => ({
				key,
				name: key,
				actions: {},
			}));

			onComplete(resources);
		} else {
			const resources: ResourceDefinition[] = resourceKeys.map(key => ({
				key,
				name: key,
				actions: {},
			}));

			onComplete(resources);
		}
	};

	return (
		<Box flexDirection="column">
			<Text> Enter resources (comma-separated):</Text>
			<Box>
				<Text>❯ </Text>
				<TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
			</Box>
			{status === 'processing' && <Text>Processing...</Text>}
			{errorMessage && <Text color="red"> {errorMessage}</Text>}
		</Box>
	);
};
