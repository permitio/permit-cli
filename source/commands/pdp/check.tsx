import React from 'react';
import { Box, Newline, Text } from 'ink';
import zod, { string } from 'zod';
import { option } from 'pastel';
import { CLOUD_PDP_URL, KEYSTORE_PERMIT_SERVICE_NAME } from '../../config.js';
import Spinner from 'ink-spinner';
import { keyAccountOption } from '../../options/keychain.js';
import * as keytar from 'keytar';
import { inspect } from 'util';
import { parseAttributes } from '../../utils/attributes.js';
import { getNamespaceIl18n } from '../../lib/i18n.js';
const i18n = getNamespaceIl18n('pdp.check');

export const options = zod.object({
	user: zod
		.string()
		.min(1, 'User identifier cannot be empty')
		.describe(
			option({
				description: 'Unique Identity to check for (Required)',
				alias: 'u',
			}),
		),
	userAttributes: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'User attributes in format key1:value1,key2:value2 (Optional)',
				alias: 'ua',
			}),
		),
	resource: zod
		.string()
		.min(1, 'Resource cannot be empty')
		.describe(
			option({
				description: 'Resource being accessed (Required)',
				alias: 'r',
			}),
		),
	resourceAttributes: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Resource attributes in format key1:value1,key2:value2 (Optional)',
				alias: 'ra',
			}),
		),
	action: zod
		.string()
		.min(1, 'Action cannot be empty')
		.describe(
			option({
				description:
					'Action being performed on the resource by the user (Required)',
				alias: 'a',
			}),
		),
	tenant: zod
		.string()
		.optional()
		.default('default')
		.describe(
			option({
				description:
					'The tenant the resource belongs to (Optional, defaults to "default")',
				alias: 't',
			}),
		),
	pdpurl: string()
		.optional()
		.describe(
			option({
				description:
					'The URL of the PDP service. Default to the cloud PDP. (Optional)',
			}),
		),
	apiKey: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'The API key for the Permit env, project or Workspace (Optional)',
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
	const [res, setRes] = React.useState<AllowedResult>({ allow: undefined });

	const queryPDP = async (apiKey: string) => {
		try {
			const userAttrs = options.userAttributes
				? parseAttributes(options.userAttributes)
				: {};
			const resourceAttrs = options.resourceAttributes
				? parseAttributes(options.resourceAttributes)
				: {};

			const response = await fetch(
				`${options.pdpurl || CLOUD_PDP_URL}/allowed`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
					},
					body: JSON.stringify({
						user: {
							key: options.user,
							...userAttrs,
						},
						resource: {
							type: options.resource.includes(':')
								? options.resource.split(':')[0]
								: options.resource,
							key: options.resource.includes(':')
								? options.resource.split(':')[1]
								: '',
							tenant: options.tenant,
							...resourceAttrs,
						},
						action: options.action,
					}),
				},
			);

			if (!response.ok) {
				const errorText = await response.text();
				setError(errorText);
				return;
			}

			setRes(await response.json());
		} catch (err) {
			if (err instanceof Error) {
				setError(err.message);
			} else {
				setError(String(err));
			}
		}
	};

	React.useEffect(() => {
		keytar
			.getPassword(KEYSTORE_PERMIT_SERVICE_NAME, options.keyAccount)
			.then(value => {
				const apiKey = value || '';
				queryPDP(apiKey);
			})
			.catch(reason => {
				setError(reason);
			});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [options.keyAccount]);

	return (
		<>
			{/* The following text adheres to react/no-unescaped-entities rule */}
			<Text>
				{i18n('user')}=&quot;{options.user}&quot;
				{options.userAttributes && ` ${i18n('attributes')}=${options.userAttributes}`}
				{i18n('action')}={options.action} {i18n('resource')}=
				{options.resource}
				{options.resourceAttributes &&
					` ${i18n('attributes')}=${options.resourceAttributes}`}
				{i18n('tenant')}={options.tenant}
			</Text>
			{res.allow === true && (
				<>
					<Text color={'green'}>{i18n('status.allowed')}</Text>
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
			{res.allow === false && <Text color={'red'}>{i18n('status.denied')}</Text>}
			{res.allow === undefined && error === '' && <Spinner type="dots" />}
			{error && (
				<Box>
					<Text color="red">{i18n('error.message', { error })}</Text>
					<Newline />
					<Text>{JSON.stringify(res)}</Text>
				</Box>
			)}
		</>
	);
}
