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
	if (template) {
		if (local) {
			ApplyTemplateLocally(template, key)
				.then(message => {
					if (message.startsWith('Error')) {
						setErrorMessage(message);
					} else {
						setSuccessMessage(message);
					}
				})
				.catch(error => {
					setErrorMessage(
						error instanceof Error ? error.message : (error as string),
					);
				});
		}
		ApplyTemplate(template, key)
			.then(message => {
				if (message.startsWith('Error')) {
					setErrorMessage(message);
				} else {
					setSuccessMessage(message);
				}
			})
			.catch(error => {
				setErrorMessage(
					error instanceof Error ? error.message : (error as string),
				);
			});
	}
	const handleSelect = async (item: SelectItemType) => {
		if (local) {
			ApplyTemplateLocally(item.value, key)
				.then(message => {
					if (message.startsWith('Error')) {
						setErrorMessage(message);
					} else {
						setSuccessMessage(message);
					}
				})
				.catch(error => {
					setErrorMessage(
						error instanceof Error ? error.message : (error as string),
					);
				});
		} else {
			const message = await ApplyTemplate(item.value, key);
			if (message.startsWith('Error')) {
				setErrorMessage(message);
			} else {
				setSuccessMessage(message);
			}
		}
	};
	return (
		<>
			
			{template == undefined && (
				<SelectInput items={selectionValues} onSelect={handleSelect} />
			)}
			{errorMessage != '' && <Text>{errorMessage}</Text>}
			{successMessage != '' && <Text>{successMessage}</Text>}
		</>
	);
}
