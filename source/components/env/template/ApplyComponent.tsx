import React, { useState } from 'react';
import { getFiles, ApplyTemplate } from '../../../lib/env/template/utils.js';
import SelectInput from 'ink-select-input';
import { Text } from 'ink';
import { loadAuthToken } from '../../../lib/auth.js';

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
	const key = apiKey || loadAuthToken();
	const selectionValues = files.map(file => ({
		label: file,
		value: file,
	}));
	const handleSelect = async (item: SelectItemType) => {
		if (local) {
			// To be implemented
		} else {
			const message = await ApplyTemplate(item.value, await key);
			if (message.startsWith('Error')) {
				setErrorMessage(message);
			} else {
				setSuccessMessage(message);
			}
		}
	};
	return (
		<>
			{' '}
			{template == undefined && (
				<SelectInput items={selectionValues} onSelect={handleSelect} />
			)}
			{errorMessage != '' && <Text>{errorMessage}</Text>}
			{successMessage != '' && <Text>{successMessage}</Text>}
		</>
	);
}
