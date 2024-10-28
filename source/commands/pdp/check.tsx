import React from 'react';
import { Box, Newline, Text } from 'ink';
import zod, { string } from 'zod';
import { option } from 'pastel';
import { CLOUD_PDP_URL, KEYSTORE_PERMIT_SERVICE_NAME } from '../../config.js';
import Spinner from 'ink-spinner';
import { keyAccountOption } from '../../options/keychain.js';
import * as keytar from 'keytar';
import { inspect } from 'util';

export const options = zod.object({
	user: zod
		.string()
		.describe(
			option({ description: 'Unique Identity to check for', alias: 'u' }),
		),
	resource: zod
		.string()
		.describe(option({ description: 'Resource being accessed', alias: 'r' })),
	action: zod.string().describe(
		option({
			description: 'Action being performed on the resource by the user',
			alias: 'a',
		}),
	),
	tenant: zod
		.string()
		.optional()
		.default('default')
		.describe(
			option({
				description: 'the tenant the resource belongs to',
				alias: 't',
			}),
		),
	pdpurl: string()
		.optional()
		.describe(
			option({
				description: 'The URL of the PDP service. Default to the cloud PDP.',
			}),
		),
	apiKey: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'The API key for the Permit env, project or Workspace',
			}),
		),
	keyAccount: keyAccountOption,
});

type Props = {
	options: zod.infer<typeof options>;
};

interface AllowedResult {
	allow?: boolean;
}

export default function Check({ options }: Props) {
	const [error, setError] = React.useState('');
	// result of API
	const [res, setRes] = React.useState<AllowedResult>({ allow: undefined });

	const queryPDP = React.useCallback(
		async (apiKey: string) => {
			try {
				const response = await fetch(
					`${options.pdpurl || CLOUD_PDP_URL}/allowed`,
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
						},
						body: JSON.stringify({
							user: { key: options.user },
							resource: {
								type: options.resource.includes(':')
									? options.resource.split(':')[0]
									: options.resource,
								key: options.resource.includes(':')
									? options.resource.split(':')[1]
									: '',
								tenant: options.tenant,
							},
							action: options.action,
						}),
					},
				);

				if (!response.ok) {
					setError(await response.text());
					return;
				}

				setRes(await response.json());
			} catch (err) {
				setError(err instanceof Error ? err.message : String(err));
			}
		},
		[
			options.pdpurl,
			options.user,
			options.resource,
			options.tenant,
			options.action,
		],
	);

	React.useEffect(() => {
		keytar
			.getPassword(KEYSTORE_PERMIT_SERVICE_NAME, options.keyAccount)
			.then(value => {
				const apiKey = value || '';
				queryPDP(apiKey);
			})
			.catch(reason => {
				setError(String(reason));
			});
	}, [options.keyAccount, queryPDP]);

	return (
		<>
			<Text>
				Checking user=&quot;{options.user}&quot; action={options.action}{' '}
				resource=
				{options.resource} at tenant={options.tenant}
			</Text>
			{res.allow === true && (
				<>
					<Text color={'green'}> ALLOWED </Text>
					<Box marginLeft={4}>
						<Text>
							{inspect(res, {
								colors: true,
								depth: null,
								maxArrayLength: Infinity,
							})}
						</Text>
					</Box>
				</>
			)}
			{res.allow === false && <Text color={'red'}> DENIED</Text>}
			{res.allow === undefined && error === '' && <Spinner type="dots" />}
			{error && (
				<Box>
					<Text color="red">Request failed: {error}</Text>
					<Newline />
					<Text>{JSON.stringify(res)}</Text>
				</Box>
			)}
		</>
	);
}
