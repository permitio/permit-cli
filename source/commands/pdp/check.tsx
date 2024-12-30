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
import i18next from 'i18next';

export const options = zod.object({
	user: zod
		.string()
		.min(1, 'User identifier cannot be empty')
		.describe(
			option({
				description: i18next.t('check.userDescription'),
				alias: 'u',
			}),
		),
	userAttributes: zod
		.string()
		.optional()
		.describe(
			option({
				description: i18next.t('check.userAttributesDescription'),
				alias: 'ua',
			}),
		),
	resource: zod
		.string()
		.min(1, 'Resource cannot be empty')
		.describe(
			option({
				description: i18next.t('check.resourceDescription'),
				alias: 'r',
			}),
		),
	resourceAttributes: zod
		.string()
		.optional()
		.describe(
			option({
				description: i18next.t('check.resourceAttributesDescription'),
				alias: 'ra',
			}),
		),
	action: zod
		.string()
		.min(1, 'Action cannot be empty')
		.describe(
			option({
				description: i18next.t('check.actionDescription'),
				alias: 'a',
			}),
		),
	tenant: zod
		.string()
		.optional()
		.default('default')
		.describe(
			option({
				description: i18next.t('check.tenantDescription'),
				alias: 't',
			}),
		),
	pdpurl: string()
		.optional()
		.describe(
			option({
				description: i18next.t('check.pdpurlDescription'),
			}),
		),
	apiKey: zod
		.string()
		.optional()
		.describe(
			option({
				description: i18next.t('check.apiKeyDescription'),
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
				if (reason instanceof Error) {
					setError(reason.message);
				} else {
					setError(String(reason));
				}
			});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [options.keyAccount]);

	return (
		<>
			{/* The following text adheres to react/no-unescaped-entities rule */}
			<Text>
				Checking user=&quot;{options.user}&quot;
				{options.userAttributes && ` with attributes=${options.userAttributes}`}
				action={options.action} resource=
				{options.resource}
				{options.resourceAttributes &&
					` with attributes=${options.resourceAttributes}`}
				at tenant={options.tenant}
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
