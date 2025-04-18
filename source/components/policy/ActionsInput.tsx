import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { components } from '../../lib/api/v1.js';

interface ActionInputProps {
	onComplete: (
		actions: Record<string, components['schemas']['ActionBlockEditable']>,
	) => void;
	onError: (error: string) => void;
	availableResources: string[];
}

export const ActionInput: React.FC<ActionInputProps> = ({
	onComplete,
	onError,
	availableResources = [],
}) => {
	const [input, setInput] = useState('');
	const placeholder = 'create, read, update, delete';

	const validateActionKey = (key: string): boolean => {
		return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key);
	};

	const handleSubmit = (value: string) => {
		if (value.trim() === '') {
			setInput(placeholder);
			return;
		}
		try {
			const valueToProcess = value.trim();
			const keys = valueToProcess
				.split(',')
				.map(k => k.trim())
				.filter(Boolean);

			if (keys.length === 0) {
				onError('Please enter at least one action');
				return;
			}

			const invalidKeys = keys.filter(key => !validateActionKey(key));
			if (invalidKeys.length > 0) {
				onError(`Invalid action keys: ${invalidKeys.join(', ')}`);
				return;
			}

			const actions = keys.reduce(
				(acc, key) => {
					acc[key] = {
						name: key,
						description: `${key.charAt(0).toUpperCase() + key.slice(1)} access`,
					};
					return acc;
				},
				{} as Record<string, components['schemas']['ActionBlockEditable']>,
			);

			onComplete(actions);
			setInput('');
		} catch (err) {
			onError((err as Error).message);
		}
	};

	return (
		<Box flexDirection="column" gap={1}>
			<Box>
				<Text bold>Action Configuration</Text>
			</Box>
			{availableResources.length > 0 && (
				<Box>
					<Text color="cyan">Resources: {availableResources.join(', ')}</Text>
				</Box>
			)}

			<Box>
				<Text>Enter action keys (comma-separated):</Text>
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
		</Box>
	);
};
