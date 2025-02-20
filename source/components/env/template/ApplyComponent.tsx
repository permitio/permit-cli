import React, { useState } from 'react';
import {
	getFiles,
	ApplyTemplate,
	ApplyTemplateLocally,
} from '../../../lib/env/template/utils.js';
import SelectInput from 'ink-select-input';
import { Text } from 'ink';
import { useAuth } from '../../AuthProvider.js';

type Props = {
	apiKey?: string;
	local?: boolean;
	template?: string;
};

type SelectItemType = {
	label: string;
	value: string;
};

export default function ApplyComponent({ apiKey, local, template }: Props) {
	const [errorMessage, setErrorMessage] = useState('');
	const [successMessage, setSuccessMessage] = useState('');
	const files = getFiles();
	const { authToken } = useAuth();
	const key = apiKey || authToken;

	const selectionValues = files.map(file => ({
		label: file,
		value: file,
	}));

	// Function to apply template
	const applyTemplate = async (selectedTemplate: string) => {
		try {
			const message = local
				? await ApplyTemplateLocally(selectedTemplate, key)
				: await ApplyTemplate(selectedTemplate, key);

			if (message.startsWith('Error')) {
				setErrorMessage(message);
			} else {
				setSuccessMessage(message);
			}
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : String(error));
		}
	};

	// If a template is passed as a prop, apply it immediately
	if (template) {
		applyTemplate(template);
	}

	// Handle user selection from SelectInput
	const handleSelect = async (item: SelectItemType) => {
		await applyTemplate(item.value);
	};

	return (
		<>
			{!template && (
				<SelectInput items={selectionValues} onSelect={handleSelect} />
			)}
			{errorMessage && <Text color="red">{errorMessage}</Text>}
			{successMessage && <Text color="green">{successMessage}</Text>}
		</>
	);
}
