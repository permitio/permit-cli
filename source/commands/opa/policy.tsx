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

interface PolicyResult {
	id: string;
	[key: string]: unknown;
}

interface QueryResult {
	result: { result: Array<PolicyResult> };
	status: number;
}

interface SelectOption {
	label: string;
	value: string;
}

export default function Policy({ options }: Props) {
	const [error, setError] = React.useState<Error | null>(null);
	const [res, setRes] = React.useState<QueryResult>({
		result: { result: [] },
		status: 0,
	});
	const [selection, setSelection] = React.useState<PolicyResult | undefined>(
		undefined,
	);
	const [selectionFilter, setSelectionFilter] = React.useState('');

	const queryOPA = async (apiKey: string, path?: string) => {
		const document = path ? `/${path}` : '';

		const response = await fetch(
			`${options.serverUrl}/v1/policies${document}`,
			// pass api key if not empty
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
		performQuery().catch(err =>
			setError(err instanceof Error ? err : new Error('Unknown error')),
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [options.apiKey, options.serverUrl]);

	const policyItems: SelectOption[] = res.result.result.map(i => {
		return { label: i.id, value: i.id };
	});
	const fuse = new Fuse(policyItems, {
		keys: ['label', 'value'],
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
				Listing Policies on Opa Server={options.serverUrl}
			</Text>
			{res.status === 0 && error === null && <Spinner type="dots" />}
			{res.status === 200 && (
				<>
					{!selection && (
						<>
							<Text>
								Showing {view.length} of {policyItems?.length} policies:
							</Text>

							<Box flexDirection="column" gap={1}>
								<TextInput
									placeholder="Type text to filter list"
									onSubmit={(value: string) => handleSelection(value)}
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
					<Text color="red">Request failed: {error.message}</Text>
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
