import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { components } from '../../lib/api/v1.js';

interface ActionInputProps {
	onComplete: (
		actions: Record<string, components['schemas']['ActionBlockEditable']>,
	) => void;
	availableResources: string[];
}

export const ActionInput: React.FC<ActionInputProps> = ({
	onComplete,
	availableResources = [],
}) => {
	const [input, setInput] = useState('');
	const [validationError, setValidationError] = useState<string | null>(null);
	const placeholder = 'Create, Read, Update, Delete';

	const validateActionKey = (key: string): boolean => {
		return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key);
	};

	const handleSubmit = (value: string) => {
		// Clear any previous validation errors
		setValidationError(null);

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
				setValidationError('Please enter at least one action');
				return;
			}

			const invalidKeys = keys.filter(key => !validateActionKey(key));
			if (invalidKeys.length > 0) {
				setValidationError(`Invalid action keys: ${invalidKeys.join(', ')}`);
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
			setValidationError((err as Error).message);
		}
	};

	return (
		<Box flexDirection="column" gap={1}>
			<Box>
				<Text bold>Configure Actions</Text>
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
					For Example: <Text color="yellow">{placeholder}</Text>
				</Text>
			</Box>
			<Box>
				<Text>{'> '}</Text>
				<TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
			</Box>
			{validationError && (
				<Box>
					<Text color="red">{validationError}</Text>
				</Box>
			)}
		</Box>
	);
};
