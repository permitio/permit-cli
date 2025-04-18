import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useResourcesApi } from '../../hooks/useResourcesApi.js';
import { components } from '../../lib/api/v1.js';

interface ResourceInputProps {
	onComplete: (resources: components['schemas']['ResourceCreate'][]) => void;
	onError: (error: string) => void;
}

export const ResourceInput: React.FC<ResourceInputProps> = ({
	onComplete,
	onError,
}) => {
	const [input, setInput] = useState('');
	const { getExistingResources, status } = useResourcesApi();

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

			const resources: components['schemas']['ResourceCreate'][] =
				resourceKeys.map(key => ({
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
					placeholder=" posts, comments, authors."
				/>
			</Box>
			{status === 'processing' && <Text>Validating resources...</Text>}
		</Box>
	);
};
