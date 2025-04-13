import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { components } from '../../lib/api/v1.js';

interface ActionInputProps {
	onComplete: (
		actions: Record<string, components['schemas']['ActionBlockEditable']>,
	) => void;
	onError: (error: string) => void;
}

export const ActionInput: React.FC<ActionInputProps> = ({
	onComplete,
	onError,
}) => {
	const [step, setStep] = useState<'keys' | 'details'>('keys');
	const [actionKeys, setActionKeys] = useState<string[]>([]);
	const [actions, setActions] = useState<
		Record<string, components['schemas']['ActionBlockEditable']>
	>({});
	const [currentActionIndex, setCurrentActionIndex] = useState(0);

	// Separate input states for different steps
	const [actionKeysInput, setActionKeysInput] = useState('');
	const [actionDetailsInput, setActionDetailsInput] = useState('');

	const validateActionKey = (key: string): boolean => {
		return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key);
	};

	const validateAttributeKey = (key: string): boolean => {
		return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key);
	};

	const handleKeysSubmit = (value: string) => {
		try {
			// Trim the entire input and split by comma
			const keys = value
				.trim()
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

			setActionKeys(keys);
			setActionKeysInput(''); // Reset input for next step
			setStep('details');
		} catch (err) {
			onError((err as Error).message);
		}
	};

	const handleDetailsSubmit = (value: string) => {
		try {
			const currentKey = actionKeys[currentActionIndex];
			// Trim the entire input first
			const [descPart = '', attrPart = ''] = value
				.trim()
				.split('@')
				.map(s => s.trim());

			// Validate attributes if provided
			if (attrPart) {
				const attributeKeys = attrPart
					.split(',')
					.map(a => a.trim())
					.filter(Boolean); // Filter out empty strings after trim

				const invalidAttrs = attributeKeys.filter(
					key => !validateAttributeKey(key),
				);
				if (invalidAttrs.length > 0) {
					onError(`Invalid attribute keys: ${invalidAttrs.join(', ')}`);
					return;
				}

				const action: components['schemas']['ActionBlockEditable'] = {
					name: currentKey,
					description: descPart || undefined,
					attributes:
						attributeKeys.length > 0
							? (Object.fromEntries(
									attributeKeys.map(attr => [attr, {}]),
								) as Record<string, never>)
							: undefined,
				};

				const updatedActions = currentKey
					? {
							...actions,
							[currentKey]: action,
						}
					: actions;

				if (currentActionIndex === actionKeys.length - 1) {
					onComplete(updatedActions);
				} else {
					setActions(updatedActions);
					setCurrentActionIndex(prev => prev + 1);
					setActionDetailsInput(''); // Clear input for next action
				}
			}
		} catch (err) {
			onError((err as Error).message);
		}
	};

	return (
		<Box flexDirection="column" gap={1}>
			{step === 'keys' && (
				<>
					<Box>
						<Text bold>Action Configuration</Text>
					</Box>
					<Box>
						<Text>Enter action keys (comma-separated):</Text>
					</Box>
					<Box>
						<Text>{'> '}</Text>
						<TextInput
							value={actionKeysInput}
							onChange={setActionKeysInput}
							onSubmit={handleKeysSubmit}
							placeholder={'create, read, update, delete'}
						/>
					</Box>
				</>
			)}

			{step === 'details' && (
				<Box flexDirection="column">
					<Box>
						<Text bold>
							Configure action : {actionKeys[currentActionIndex]}
						</Text>
					</Box>
					<Box>
						<Text>Format: description@attribute1,attribute2</Text>
					</Box>
					<Box>
						<Text>{'> '}</Text>
						<TextInput
							value={actionDetailsInput}
							onChange={setActionDetailsInput}
							onSubmit={handleDetailsSubmit}
							placeholder="Create new resource@owner,department"
						/>
					</Box>
					<Box>
						<Text>{`Action ${currentActionIndex + 1} of ${actionKeys.length}`}</Text>
					</Box>
				</Box>
			)}
		</Box>
	);
};
