import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useResourceApi } from '../../hooks/useResourceApi.js';
import type { ResourceDefinition } from '../../lib/policy/utils.js';

interface ResourceInputProps {
	projectId: string;
	environmentId: string;
	apiKey?: string;
	onComplete: (resources: ResourceDefinition[]) => void;
	onError: (error: string) => void;
}

export const ResourceInput: React.FC<ResourceInputProps> = ({
	projectId,
	environmentId,
	apiKey,
	onComplete,
	onError,
}) => {
	const [input, setInput] = useState('');
	const { getExistingResources, status } = useResourceApi(
		projectId,
		environmentId,
		apiKey,
	);

	const validateResourceKey = (key: string): boolean => {
		return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key);
	};

	const handleSubmit = async (value: string) => {
		try {
			// Trim the entire input first
			const trimmedValue = value.trim();

			// Split, trim each value, and filter out empty strings
			const resourceKeys = trimmedValue
				.split(',')
				.map(k => k.trim())
				.filter(k => k.length > 0);

			if (resourceKeys.length === 0) {
				onError('Please enter at least one resource');
				return;
			}

			const invalidKeys = resourceKeys.filter(key => !validateResourceKey(key));
			if (invalidKeys.length > 0) {
				onError(`Invalid resource keys: ${invalidKeys.join(', ')}`);
				return;
			}

			const existingResources = await getExistingResources();
			const conflictingResources = resourceKeys.filter(key =>
				existingResources.has(key),
			);

			if (conflictingResources.length > 0) {
				onError(`Resources already exist: ${conflictingResources.join(', ')}`);
				return;
			}

			const resources: ResourceDefinition[] = resourceKeys.map(key => ({
				key,
				name: key,
				actions: {},
			}));

			onComplete(resources);

			// Clear input after successful submission
			setInput('');
		} catch (err) {
			onError((err as Error).message);
		}
	};

	return (
		<Box flexDirection="column" gap={1}>
			<Box>
				<Text bold>Resource Configuration</Text>
			</Box>
			<Box>
				<Text>Enter resource keys (comma-separated):</Text>
			</Box>
			<Box>
				<Text>{'> '}</Text>
				<TextInput
					value={input}
					onChange={setInput}
					onSubmit={handleSubmit}
					placeholder="users, posts, comments"
				/>
			</Box>
			{status === 'processing' && <Text>Validating resources...</Text>}
		</Box>
	);
};
