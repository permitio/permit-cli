import React, { useEffect, useState } from 'react';
import { Box, Newline, Text } from 'ink';
import Spinner from 'ink-spinner';
import { inspect } from 'util';
import { parseAttributes } from '../../utils/attributes.js';
import { PDPCheckProps } from '../../commands/pdp/check.js';
import {
	AuthorizationQuery,
	useCheckPdpApi,
} from '../../hooks/useCheckPdpApi.js';

interface AllowedResult {
	allow?: boolean;
}

export default function PDPCheckComponent({ options }: PDPCheckProps) {
	const [error, setError] = useState('');
	const [res, setRes] = useState<AllowedResult>({ allow: undefined });

	const { getAllowedCheck } = useCheckPdpApi();

	useEffect(() => {
		const queryPDP = async () => {
			try {
				const userAttrs = options.userAttributes
					? parseAttributes(options.userAttributes)
					: {};
				const resourceAttrs = options.resourceAttributes
					? parseAttributes(options.resourceAttributes)
					: {};

				const body = {
					user: {
						key: options.user,
						...userAttrs,
					},
					resource: {
						type:
							(options.resource.includes(':')
								? options.resource.split(':')[0]
								: options.resource) ?? '',
						key: options.resource.includes(':')
							? options.resource.split(':')[1]
							: '',
						tenant: options.tenant,
						...resourceAttrs,
					},
					action: options.action,
				};
				const { data, response } = await getAllowedCheck(
					body as AuthorizationQuery,
					options.pdpurl,
				);

				if (!response.ok) {
					const errorText = await response.text();
					setError(errorText);
					return;
				}

				setRes({ allow: data?.allow });
			} catch (err) {
				if (err instanceof Error) {
					setError(err.message);
				} else {
					setError(String(err));
				}
			}
		};

		queryPDP();
	}, [getAllowedCheck, options]);

	return (
		<>
			{/*The following text adheres to react/no-unescaped-entities rule */}
			<Text>
				Checking user=&quot;{options.user}&quot;{' '}
				{options.userAttributes &&
					` with attributes=${options.userAttributes && ' '}`}
				action=&quot;{options.action}&quot; resource=&quot;{options.resource}
				&quot;{' '}
				{options.resourceAttributes &&
					` with attributes=${options.resourceAttributes} && ' '`}
				at tenant=&quot;{options.tenant}&quot;
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
