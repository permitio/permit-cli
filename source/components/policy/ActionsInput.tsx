import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import type { ActionDefinition } from '../../lib/policy/utils.js';

interface ActionInputProps {
	onComplete: (actions: Record<string, ActionDefinition>) => void;
}

export const ActionInput: React.FC<ActionInputProps> = ({ onComplete }) => {
	const [step, setStep] = useState<'keys' | 'details'>('keys');
	const [actionKeys, setActionKeys] = useState<string[]>([]);
	const [actions, setActions] = useState<Record<string, ActionDefinition>>({});
	const [input, setInput] = useState('');

	const handleKeysSubmit = (value: string) => {
		const keys = value
			.split(',')
			.map(k => k.trim())
			.filter(Boolean);
		setActionKeys(keys);
		setStep('details');
	};

	const handleDetailsSubmit = (value: string) => {
		const currentKey = actionKeys[0];
		const [description, attrString] = value.split('@');

		const action: ActionDefinition = {
			name: currentKey,
			description: description?.trim(),
			attributes: attrString
				? (Object.fromEntries(
						attrString.split(',').map(attr => [attr.trim(), {}]),
					) as Record<string, never>)
				: undefined,
		};

		const updatedActions = currentKey
			? { ...actions, [currentKey]: action }
			: actions;

		if (actionKeys.length === 1) {
			onComplete(updatedActions);
		} else {
			setActions(updatedActions);
			setActionKeys(prev => prev.slice(1));
			setInput('');
		}
	};

	return (
		<Box flexDirection="column">
			{step === 'keys' && (
				<>
					<Text>Enter actions (comma-separated):</Text>
					<Box>
						<Text>❯ </Text>
						<TextInput
							value={input}
							onChange={setInput}
							onSubmit={handleKeysSubmit}
						/>
					</Box>
				</>
			)}

			{step === 'details' && (
				<>
					<Text> Enter details for action "{actionKeys[0]}":</Text>
					<Text>Format: description@attribute1,attribute2</Text>
					<Box>
						<Text>❯ </Text>
						<TextInput
							value={input}
							onChange={setInput}
							onSubmit={handleDetailsSubmit}
						/>
					</Box>
				</>
			)}
		</Box>
	);
};
