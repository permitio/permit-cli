import React, { useState, useCallback, useEffect } from 'react';
import {
	getFiles,
	ApplyTemplate,
	ApplyTemplateLocally,
	getResourceAndAction,
} from '../../../lib/env/template/utils.js';
import SelectInput from 'ink-select-input';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';
import { useAuth } from '../../AuthProvider.js';

type Props = {
	local?: boolean;
	template?: string;
	onComplete?: (resource: string, action: string) => void;
	onError?: (error: string) => void;
};

type SelectItemType = {
	label: string;
	value: string;
};

export default function ApplyComponent({
	local,
	template,
	onComplete,
	onError,
}: Props) {
	const [errorMessage, setErrorMessage] = useState('');
	const [successMessage, setSuccessMessage] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [showContinue, setShowContinue] = useState(false);
	const files = getFiles();
	const { authToken: key } = useAuth();
	const [resource, setResource] = useState<string | null>(null);
	const [action, setAction] = useState<string | null>(null);

	const selectionValues = files.map(file => ({
		label: file,
		value: file,
	}));

	// Modified to handle errors immediately but success with Continue button
	useEffect(() => {
		if (errorMessage) {
			if (onError) onError(errorMessage);
			else {
				setTimeout(() => {
					process.exit(1);
				}, 500);
			}
		}
		if (successMessage && !onComplete) {
			setTimeout(() => {
				process.exit(0);
			}, 500);
		}
		// Don't automatically call onComplete - we'll do it when Continue is pressed
	}, [errorMessage, onError, successMessage, onComplete]);

	const handleContinue = useCallback(() => {
		if (onComplete && resource && action) {
			onComplete(resource, action);
		}
	}, [onComplete, resource, action]);

	// Memoized function to apply template
	const applyTemplate = useCallback(
		async (selectedTemplate: string) => {
			setIsLoading(true);
			const { resource, action } = getResourceAndAction(selectedTemplate);
			setResource(resource);
			setAction(action);
			try {
				const message = local
					? await ApplyTemplateLocally(selectedTemplate, key)
					: await ApplyTemplate(selectedTemplate, key);

				if (message.startsWith('Error')) {
					setErrorMessage(message);
				} else {
					setSuccessMessage(message);
					// If we have an onComplete handler, show the continue button
					if (onComplete) {
						setShowContinue(true);
					}
				}
			} catch (error) {
				setErrorMessage(error instanceof Error ? error.message : String(error));
			} finally {
				setIsLoading(false);
			}
		},
		[local, key, onComplete],
	);

	// If a template is passed as a prop, apply it once
	useEffect(() => {
		if (template) {
			applyTemplate(template);
		}
	}, [template, applyTemplate]);

	// Handle user selection from SelectInput
	const handleSelect = async (item: SelectItemType) => {
		setIsLoading(true);
		await applyTemplate(item.value);
	};

	return (
		<Box flexDirection="column">
			{isLoading ? (
				<Text color="cyan">
					<Spinner type="dots" /> Applying template...
				</Text>
			) : errorMessage && !onError ? (
				<Text color="red">{errorMessage}</Text>
			) : successMessage ? (
				<>
					<Text color="green">{successMessage}</Text>

					{showContinue && (
						<Box marginTop={1} flexDirection={'column'}>
							<Text>Press Enter to continue</Text>
							<SelectInput
								items={[{ label: 'Continue', value: 'continue' }]}
								onSelect={() => handleContinue()}
							/>
						</Box>
					)}
				</>
			) : !template ? (
				<>
					<Text>Select Template </Text>
					<SelectInput items={selectionValues} onSelect={handleSelect} />
				</>
			) : null}
		</Box>
	);
}
