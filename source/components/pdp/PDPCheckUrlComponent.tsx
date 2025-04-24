import React, { useEffect, useState } from 'react';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';
import { parseAttributes } from '../../utils/attributes.js';
import { useCheckPdpApi } from '../../hooks/useCheckPdpApi.js';
import { PDPCheckUrlProps } from '../../commands/pdp/check-url.js';

// Interface for the component's state
interface CheckUrlState {
	loading: boolean;
	result: boolean | null;
	error: string | null;
}

const PDPCheckUrlComponent: React.FC<PDPCheckUrlProps> = ({ options }) => {
	const [state, setState] = useState<CheckUrlState>({
		loading: true,
		result: null,
		error: null,
	});

	const { getAllowedUrlCheck } = useCheckPdpApi();

	useEffect(() => {
		const checkUrl = async () => {
			try {
				// Parse user attributes if provided
				const userAttributesObj: Record<string, string | number | boolean> = {};
				if (options.userAttributes && options.userAttributes.length > 0) {
					for (const attrPair of options.userAttributes) {
						const parsedAttrs = parseAttributes(attrPair);
						Object.assign(userAttributesObj, parsedAttrs);
					}
				}

				// Prepare the request payload
				const payload = {
					user: {
						key: options.user,
						// Always include attributes as a required field
						attributes: userAttributesObj,
					},
					url: options.url,
					http_method: options.method,
					tenant: options.tenant,
					context: {}, // Required empty object
					sdk: 'permit-cli',
				};

				// Make the API call
				const { data, error } = await getAllowedUrlCheck(
					payload,
					options['pdp-url'],
				);

				if (error) {
					setState({ loading: false, result: null, error });
					return;
				}

				setState({ loading: false, result: data?.allow ?? false, error: null });
			} catch (e) {
				setState({
					loading: false,
					result: null,
					error: e instanceof Error ? e.message : String(e),
				});
			}
		};

		checkUrl();
	}, [options, getAllowedUrlCheck]);

	if (state.loading) {
		return (
			<Text>
				<Spinner type="dots" /> Checking URL permission...
			</Text>
		);
	}

	if (state.error) {
		return (
			<Box flexDirection="column">
				<Text color="red">Error checking URL permission:</Text>
				<Text>{state.error}</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Text>URL: {options.url}</Text>
			<Text>Method: {options.method}</Text>
			<Text>User: {options.user}</Text>
			<Text>Tenant: {options.tenant}</Text>
			<Text>
				{state.result === true ? (
					<Text color="green">✓ Allowed</Text>
				) : (
					<Text color="red">✗ Denied</Text>
				)}
			</Text>
		</Box>
	);
};

export default PDPCheckUrlComponent;
