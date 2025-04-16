// File: components/api/proxy/CreateProxyConfigComponent.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Text } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { type infer as zType } from 'zod';
import { useAuth } from '../../AuthProvider.js';
import { useCreateProxy } from '../../../hooks/useCreateProxy.js';
import { options as originalOptions } from '../../../commands/api/create/proxy.js';

type ExtendedOptions = zType<typeof originalOptions>;

type Props = {
	options: ExtendedOptions;
};

type Field = 'key' | 'secret' | 'name' | 'done'| 'input';

export default function CreateProxyConfigComponent({ options }: Props) {
	const { scope } = useAuth();

	// Local states for required fields.
	const [proxyKey, setProxyKey] = useState<string>(options.key || '');
	const [proxySecret, setProxySecret] = useState<string>(options.secret || '');
	const [proxyName, setProxyName] = useState<string>(options.name || '');

	// Local state for interactive input; tracks which field is currently active.
	const [currentField, setCurrentField] = useState<Field>('key');

	// Use the hook's status and error state (do not duplicate these locally)
	const {
		status,
		errorMessage,
		createProxy,
		formatErrorMessage,
		setStatus,
		setErrorMessage,
	} = useCreateProxy(
		scope.project_id || options.projId,
		scope.environment_id || options.envId,
		options.apiKey
	);

	// On mount: if all required values are provided via options then trigger the API call.
	// Otherwise, set status to 'input' so the user is prompted.
	useEffect(() => {
		if (options.key && options.secret && options.name) {
			setCurrentField('done');
			triggerCreate();
		} else {
			setStatus('input');
			// Decide which field to prompt first (order: key -> secret -> name).
			if (!options.key) {
				setCurrentField('key');
			} else if (!options.secret) {
				setCurrentField('secret');
			} else if (!options.name) {
				setCurrentField('name');
			}
		}
		// Run only once on mount.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Function to trigger the API call.
	const triggerCreate = useCallback(() => {
		createProxy({
			secret: proxySecret,
			key: proxyKey,
			name: proxyName,
			auth_mechanism: options.authMechanism || 'Bearer',
			mapping_rules: options.mapping_rules || [],
		}).catch((err: unknown) => {
			setErrorMessage(err instanceof Error ? err.message : String(err));
			setStatus('error');
		});
	}, [
		createProxy,
		options.authMechanism,
		options.mapping_rules,
		proxyKey,
		proxyName,
		proxySecret,
		setErrorMessage,
		setStatus,
	]);

	// Interactive input handlers – each handler updates its field and moves to the next.
	const handleKeySubmit = useCallback(
		(value: string) => {
			if (value.trim() === '') return; // Prevent empty submission
			setProxyKey(value);
			// Move to prompting for the secret.
			setCurrentField('secret');
		},
		[]
	);

	const handleSecretSubmit = useCallback(
		(value: string) => {
			if (value.trim() === '') return;
			setProxySecret(value);
			// Move to prompting for the name.
			setCurrentField('name');
		},
		[]
	);

	const handleNameSubmit = useCallback(
		(value: string) => {
			if (value.trim() === '') return;
			setProxyName(value);
			// All required fields collected.
			setCurrentField('done');
			setStatus('processing');
			triggerCreate();
		},
		[triggerCreate, setStatus]
	);

	// Render interactive prompts based on the currentField.
	if (status === 'input') {
		if (currentField === 'key') {
			return (
				<>
					<Text color="yellow">Proxy Key is required. Please enter it:</Text>
					<TextInput value={proxyKey} onChange={setProxyKey} onSubmit={handleKeySubmit} />
				</>
			);
		}
		if (currentField === 'secret') {
			return (
				<>
					<Text color="yellow">Proxy Secret is required. Please enter it:</Text>
					<TextInput value={proxySecret} onChange={setProxySecret} onSubmit={handleSecretSubmit} />
				</>
			);
		}
		if (currentField === 'name') {
			return (
				<>
					<Text color="yellow">Proxy Name is required. Please enter it:</Text>
					<TextInput value={proxyName} onChange={setProxyName} onSubmit={handleNameSubmit} />
				</>
			);
		}
	}

	if (status === 'processing') {
		return <Text><Spinner type="dots" /> Creating proxy config...</Text>;
	}
	if (status === 'error' && errorMessage) {
		return <Text color="red">Error: {formatErrorMessage(errorMessage)}</Text>;
	}
	if (status === 'done') {
		return <Text color="green">Proxy Config created successfully!</Text>;
	}
	return null;
}
