import React, { useCallback, useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';
import { useAuth } from '../AuthProvider.js';
import { useEnvironmentApi } from '../../hooks/useEnvironmentApi.js';

type CreateComponentProps = {
	name?: string;
	envKey?: string;
	description?: string;
};

export default function CreateComponent({
	name: initialName,
	envKey: initialKey,
	description: initialDescription,
}: CreateComponentProps) {
	const { scope } = useAuth();
	const { createEnvironment } = useEnvironmentApi();

	const [step, setState] = useState<
		| 'name_input'
		| 'key_input'
		| 'description_input'
		| 'creating'
		| 'done'
		| 'error'
	>(
		initialName
			? initialKey
				? 'description_input'
				: 'key_input'
			: 'name_input',
	);

	const [name, setName] = useState<string>(initialName || '');
	const [key, setKey] = useState<string>(initialKey || '');
	const [description, setDescription] = useState<string>(
		initialDescription || '',
	);
	const [createdEnvironmentId, setCreatedEnvironmentId] = useState<string>('');
	const [error, setError] = useState<string | null>(null);

	// Handle name submission
	const handleNameSubmit = useCallback(
		(value: string) => {
			setName(value);
			// Derive a key from the name if not provided
			if (!key) {
				const derivedKey = value.toLowerCase().replace(/[^a-z0-9]/g, '_');
				setKey(derivedKey);
			}
			setState('key_input');
		},
		[key],
	);

	// Handle key submission
	const handleKeySubmit = useCallback((value: string) => {
		setKey(value);
		setState('description_input');
	}, []);

	// Handle description submission
	const handleDescriptionSubmit = useCallback(
		async (value: string) => {
			setDescription(value);
			setState('creating');

			try {
				const result = await createEnvironment(
					scope.project_id || '', // Project ID from context
					undefined, // No need for access token
					null, // No cookie needed
					{
						// Parameters
						name,
						key,
						description: value || undefined,
					},
				);

				if (result.error) {
					setError(`Failed to create environment: ${result.error}`);
					setState('error');
					return;
				}

				const environmentData = result.data;
				if (!environmentData) {
					setError('No environment data received from API');
					setState('error');
					return;
				}

				setCreatedEnvironmentId(environmentData.id);
				setState('done');

				// Add a short delay before exiting to ensure the output is visible
				setTimeout(() => {
					process.exit(0);
				}, 500);
			} catch (err) {
				setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
				setState('error');
			}
		},
		[createEnvironment, key, name, scope.project_id],
	);

	// If initial values are provided, start creating right away
	useEffect(() => {
		if (
			initialName &&
			initialKey &&
			initialDescription &&
			step === 'description_input'
		) {
			handleDescriptionSubmit(initialDescription);
		}
	}, [
		handleDescriptionSubmit,
		initialDescription,
		initialKey,
		initialName,
		step,
	]);

	if (step === 'name_input') {
		return (
			<Box flexDirection="column">
				<Text>Enter environment name:</Text>
				<TextInput
					value={name}
					onChange={setName}
					onSubmit={handleNameSubmit}
				/>
			</Box>
		);
	}

	if (step === 'key_input') {
		return (
			<Box flexDirection="column">
				<Text>
					Enter environment key (or press Enter to use the suggested key):
				</Text>
				<TextInput value={key} onChange={setKey} onSubmit={handleKeySubmit} />
				<Text dimColor>
					Keys should only contain lowercase letters, numbers, and underscores.
				</Text>
			</Box>
		);
	}

	if (step === 'description_input') {
		return (
			<Box flexDirection="column">
				<Text>Enter environment description (optional):</Text>
				<TextInput
					value={description}
					onChange={setDescription}
					onSubmit={handleDescriptionSubmit}
				/>
			</Box>
		);
	}

	if (step === 'creating') {
		return (
			<Box>
				<Text>
					<Spinner type="dots" /> Creating environment...
				</Text>
			</Box>
		);
	}

	if (step === 'done') {
		return (
			<Box flexDirection="column">
				<Text>✅ Environment created successfully!</Text>
				<Text>Environment ID: {createdEnvironmentId}</Text>
				<Text>Name: {name}</Text>
				<Text>Key: {key}</Text>
				{description && <Text>Description: {description}</Text>}
				<Text>Organization ID: {scope.organization_id}</Text>
				{scope.project_id && <Text>Project ID: {scope.project_id}</Text>}
			</Box>
		);
	}

	// Error state
	return (
		<Box flexDirection="column">
			<Text color="red">Error: {error}</Text>
		</Box>
	);
}
