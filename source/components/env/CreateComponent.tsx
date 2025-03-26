import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';
import { useAuth } from '../AuthProvider.js';
import {
	useEnvironmentApi,
	CreateEnvironmentParams,
} from '../../hooks/useEnvironmentApi.js';

// Define component props
type CreateComponentProps = {
	name?: string;
	envKey?: string;
	description?: string;
	customBranchName?: string;
	jwks?: string;
	settings?: string;
};

// Define field IDs type for type safety
type FieldId =
	| 'name'
	| 'key'
	| 'description'
	| 'customBranchName'
	| 'jwks'
	| 'settings';

// FormField type definition
type FormField = {
	id: FieldId;
	label: string;
	required: boolean;
	helpText?: string;
	defaultDerivedFrom?: FieldId;
};

// Define form state type
type FormStateType = {
	currentField: number;
	name: string;
	key: string;
	description: string;
	customBranchName: string;
	jwks: string;
	settings: string;
};

export default function CreateComponent({
	name: initialName,
	envKey: initialKey,
	description: initialDescription,
	customBranchName: initialCustomBranchName,
	jwks: initialJwks,
	settings: initialSettings,
}: CreateComponentProps) {
	const { scope } = useAuth();
	const { createEnvironment } = useEnvironmentApi();

	// States
	const [formState, setFormState] = useState<FormStateType>({
		currentField: 0,
		name: initialName || '',
		key: initialKey || '',
		description: initialDescription || '',
		customBranchName: initialCustomBranchName || '',
		jwks: initialJwks || '',
		settings: initialSettings || '',
	});

	const [status, setStatus] = useState<
		'form' | 'submitting' | 'success' | 'error'
	>('form');
	const [error, setError] = useState<string | null>(null);
	const [createdEnvironmentId, setCreatedEnvironmentId] = useState('');

	// Define form fields
	const fields: FormField[] = [
		{
			id: 'name',
			label: 'Enter environment name:',
			required: true,
		},
		{
			id: 'key',
			label: 'Enter environment key (or press Enter to use the suggested key):',
			required: true,
			helpText:
				'Keys should only contain lowercase letters, numbers, and underscores.',
			defaultDerivedFrom: 'name',
		},
		{
			id: 'description',
			label: 'Enter environment description (optional):',
			required: false,
		},
		{
			id: 'customBranchName',
			label: 'Enter custom branch name for GitOps (optional):',
			required: false,
		},
		{
			id: 'jwks',
			label: 'Enter JWKS JSON for frontend login (optional):',
			required: false,
			helpText: 'Enter a valid JSON string or leave empty',
		},
		{
			id: 'settings',
			label: 'Enter environment settings JSON (optional):',
			required: false,
			helpText: 'Enter a valid JSON string or leave empty',
		},
	];

	// Submit form function
	const submitForm = async () => {
		setStatus('submitting');

		try {
			// Validate required fields
			if (!formState.name || !formState.key) {
				setError('Name and key are required fields');
				setStatus('error');
				return;
			}

			// Ensure project_id is available
			if (!scope.project_id) {
				setError('Project ID is missing. Cannot create environment.');
				setStatus('error');
				return;
			}

			// Build request body to match API expectations
			const requestBody: CreateEnvironmentParams = {
				name: formState.name,
				key: formState.key,
			};

			// Add optional fields if provided
			if (formState.description) {
				requestBody.description = formState.description;
			}

			if (formState.customBranchName) {
				requestBody.custom_branch_name = formState.customBranchName;
			}

			// Handle JSON fields
			if (formState.jwks) {
				try {
					const jwksObj = JSON.parse(formState.jwks);
					requestBody.jwks = {
						ttl: jwksObj.ttl || 600, // Default TTL if not provided
						...jwksObj,
					};
				} catch (e) {
					setError(
						`Invalid JWKS JSON: ${e instanceof Error ? e.message : String(e)}`,
					);
					setStatus('error');
					return;
				}
			}

			if (formState.settings) {
				try {
					requestBody.settings = JSON.parse(formState.settings);
				} catch (e) {
					setError(
						`Invalid settings JSON: ${e instanceof Error ? e.message : String(e)}`,
					);
					setStatus('error');
					return;
				}
			}

			// Call API to create environment
			const result = await createEnvironment(
				scope.project_id,
				undefined,
				null,
				requestBody,
			);

			if (result.error) {
				setError(`Failed to create environment: ${result.error}`);
				setStatus('error');
				return;
			}

			if (!result.data) {
				setError('No environment data received from API');
				setStatus('error');
				return;
			}

			setCreatedEnvironmentId(result.data.id);
			setStatus('success');

			// Auto-exit after success
			setTimeout(() => {
				process.exit(0);
			}, 1500);
		} catch (err) {
			setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
			setStatus('error');
		}
	};

	// Skip to appropriate field or auto-submit based on initial values
	useEffect(() => {
		// Figure out which field to start at based on provided values
		let startAtField = 0;

		if (initialName) {
			startAtField = 1; // Start at key field

			if (initialKey) {
				startAtField = 2; // Start at description field

				if (initialDescription) {
					startAtField = 3; // Start at customBranchName field

					if (initialCustomBranchName) {
						startAtField = 4; // Start at jwks field

						if (initialJwks) {
							startAtField = 5; // Start at settings field

							if (initialSettings) {
								// All fields filled, auto-submit
								setTimeout(() => {
									submitForm();
								}, 0);
								return;
							}
						}
					}
				}
			}
		}

		// Start at the determined field
		setFormState(prev => ({
			...prev,
			currentField: startAtField,
		}));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		initialName,
		initialKey,
		initialDescription,
		initialCustomBranchName,
		initialJwks,
		initialSettings,
	]);

	// Auto-derive key from name if needed
	useEffect(() => {
		// When name changes, if key is empty, derive key
		if (
			formState.name &&
			!formState.key &&
			formState.currentField < fields.length &&
			formState.currentField >= 0
		) {
			// Use non-null assertion since we've verified the index is valid
			const currentField = fields[formState.currentField]!;
			if (currentField.id === 'key') {
				setFormState(prev => ({
					...prev,
					key: prev.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
				}));
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [formState.name, formState.currentField, fields]);

	// Handle input change
	const handleInputChange = (value: string) => {
		// Safely get the current field
		if (formState.currentField < 0 || formState.currentField >= fields.length) {
			return; // Guard against out-of-bounds index
		}

		// Use non-null assertion since we've checked bounds
		const field = fields[formState.currentField]!;
		setFormState(prev => ({
			...prev,
			[field.id]: value,
		}));
	};

	// Handle field submission (when Enter is pressed)
	const handleFieldSubmit = () => {
		// Safely get the current field
		if (formState.currentField < 0 || formState.currentField >= fields.length) {
			submitForm(); // If somehow we're past the end, just submit
			return;
		}

		// Use non-null assertion since we've verified the index is valid
		const field = fields[formState.currentField]!;
		const currentValue = formState[field.id] || '';

		// Validate required fields
		if (field.required && !currentValue) {
			setError(`${field.id} is required`);
			return;
		}

		// Clear any previous errors
		setError(null);

		// Move to next field or submit if we're at the end
		if (formState.currentField < fields.length - 1) {
			// Move to next field
			setFormState(prev => ({
				...prev,
				currentField: prev.currentField + 1,
			}));
		} else {
			submitForm();
		}
	};

	// Render the current field
	const renderCurrentField = () => {
		// Safely check if current field index is valid
		if (formState.currentField < 0 || formState.currentField >= fields.length) {
			return (
				<Box>
					<Text color="red">Error: Invalid form state. Please try again.</Text>
				</Box>
			);
		}

		// Use non-null assertion since we've verified the index is valid
		const field = fields[formState.currentField]!;
		const currentValue = formState[field.id] || '';

		return (
			<Box flexDirection="column">
				<Text>{field.label}</Text>
				<TextInput
					value={currentValue}
					onChange={handleInputChange}
					onSubmit={handleFieldSubmit}
				/>
				{field.helpText ? <Text dimColor>{field.helpText}</Text> : null}
				{error && <Text color="red">{error}</Text>}
			</Box>
		);
	};

	// Render based on status
	if (status === 'form') {
		return renderCurrentField();
	}

	if (status === 'submitting') {
		return (
			<Box>
				<Text>
					<Spinner type="dots" /> Creating environment...
				</Text>
			</Box>
		);
	}

	if (status === 'success') {
		return (
			<Box flexDirection="column">
				<Text>✅ Environment created successfully!</Text>
				<Text>Environment ID: {createdEnvironmentId}</Text>
				<Text>Name: {formState.name}</Text>
				<Text>Key: {formState.key}</Text>
				{formState.description && (
					<Text>Description: {formState.description}</Text>
				)}
				{formState.customBranchName && (
					<Text>Custom Branch Name: {formState.customBranchName}</Text>
				)}
				{formState.jwks && <Text>JWKS: [JSON Web Key Set provided]</Text>}
				{formState.settings && (
					<Text>Settings: [Custom settings provided]</Text>
				)}
			</Box>
		);
	}

	// Error state
	return (
		<Box flexDirection="column">
			<Text color="red">Error: {error}</Text>
			<Text>Try again or use --help for more information.</Text>
		</Box>
	);
}
