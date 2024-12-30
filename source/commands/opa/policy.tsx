import React from 'react';
import { Box, Newline, Text } from 'ink';
import zod from 'zod';
import { option } from 'pastel';
import Spinner from 'ink-spinner';
import { keyAccountOption } from '../../options/keychain.js';
import { inspect } from 'util';
import { loadAuthToken } from '../../lib/auth.js';
import { TextInput, Select } from '@inkjs/ui';
import Fuse from 'fuse.js';
import { getNamespaceIl18n } from '../../lib/i18n.js';
const i18n = getNamespaceIl18n('opa.policy');

export const options = zod.object({
	serverUrl: zod
		.string()
		.default('http://localhost:8181')
		.describe(
			option({
				description: 'The OPA server URL',
				alias: 's',
			}),
		),
	apiKey: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'The API key for the OPA Server and Permit env, project or Workspace',
			}),
		),
	keyAccount: keyAccountOption,
});

type Props = {
	options: zod.infer<typeof options>;
};

interface PolicyItem {
	id: string;
	name?: string;
}

interface Option {
	label: string;
	value: string;
}

interface QueryResult {
	result: { result: PolicyItem[] };
	status: number;
}

export default function Policy({ options }: Props) {
	const [error, setError] = React.useState<Error | null>(null);
	const [res, setRes] = React.useState<QueryResult>({
		result: { result: [] },
		status: 0,
	});
	const [selection, setSelection] = React.useState<PolicyItem | undefined>(
		undefined,
	);
	const [selectionFilter, setSelectionFilter] = React.useState<string>('');

	const queryOPA = async (apiKey: string, path?: string) => {
		const document = path ? `/${path}` : '';
		const response = await fetch(
			`${options.serverUrl}/v1/policies${document}`,
			{ headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {} },
		);
		const data = await response.json();
		setRes({ result: data, status: response.status });
	};

	React.useEffect(() => {
		const performQuery = async () => {
			const apiKey = options.apiKey || (await loadAuthToken());
			await queryOPA(apiKey);
		};
		performQuery().catch(err => setError(err));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [options.apiKey, options.serverUrl]);

	const policyItems: Option[] = res.result.result.map(i => ({
		label: i.id,
		value: i.id,
	}));

	const fuse = new Fuse(policyItems, {
		keys: ['label', 'id'],
		minMatchCharLength: 0,
	});
	const filtered = fuse.search(selectionFilter).map(i => i.item);
	const view = filtered.length === 0 ? policyItems : filtered;

	const handleSelection = (selectedValue: string) => {
		const selectedPolicy = res.result.result.find(p => p.id === selectedValue);
		setSelection(selectedPolicy);
	};

	return (
		<>
			<Text color={'green'}>
				{i18n('title', { serverUrl: options.serverUrl })}
			</Text>
			{res.status === 0 && error === null && <Spinner type="dots" />}
			{res.status === 200 && (
				<>
					{!selection && (
						<>
							<Text>
								{i18n('subtitle', { 
									viewLength: view.length,
									policyItemsLength: policyItems.length
								})}
							</Text>

							<Box flexDirection="column" gap={1}>
								<TextInput
									placeholder={i18n('placeholder')}
									onSubmit={(value: string) => {
										const selectedPolicy = res.result.result.find(
											p => p.id === value,
										);
										setSelection(selectedPolicy);
									}}
									onChange={setSelectionFilter}
									suggestions={policyItems.map(i => i.label)}
								/>
							</Box>
							<Box padding={2} flexDirection="column" gap={1}>
								<Select options={policyItems} onChange={handleSelection} />
							</Box>
						</>
					)}
					{!!selection && (
						<Box flexDirection="column" gap={1}>
							<Text>
								{inspect(selection, {
									colors: true,
									depth: null,
									maxArrayLength: Infinity,
								})}
							</Text>
						</Box>
					)}
				</>
			)}
			{error && (
				<Box>
					<Text color="red">{i18n('requestError.message', { error: JSON.stringify(error) })}</Text>
					<Newline />
					<Text>
						{inspect(res, {
							colors: true,
							depth: null,
							maxArrayLength: Infinity,
						})}
					</Text>
				</Box>
			)}
		</>
	);
}
