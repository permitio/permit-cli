import { useApiKeyApi } from '../../source/hooks/useApiKeyApi.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { getMockFetchResponse } from '../utils.js';
import { TokenType, tokenType } from '../../source/lib/auth.js';

global.fetch = vi.fn();

vi.mock('../../source/lib/auth', () => ({
	tokenType: vi.fn(),
	TokenType: {
		APIToken: 'APIToken',
		Invalid: 'Invalid',
	},
}));

describe('useApiKeyApi', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('Calls getProjectEnvironmentApiKey and fetches the API key data', async () => {
		const environmentId = 'test-environment-id';

		(fetch as any).mockResolvedValueOnce({
			...getMockFetchResponse(),
			json: async () => ('mock-data' )
		});

		const TestComponent = () => {
			const { getProjectEnvironmentApiKey } = useApiKeyApi();
			const [result, setResult] = React.useState<string | null>(null);

			React.useEffect(() => {
				const fetchData = async () => {
					const { data } = await getProjectEnvironmentApiKey(
						environmentId
					);
					setResult(JSON.stringify(data));
				};
				fetchData();
			}, [getProjectEnvironmentApiKey]);

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('"mock-data"');
		});
	});

	it('Calls getApiKeyScope and fetches the API key scope', async () => {

		(fetch as any).mockResolvedValueOnce({
			...getMockFetchResponse(),
			json: async () => ({
					organization_id: 'org-id',
					project_id: null,
					environment_id: null,

			})
		});

		const TestComponent = () => {
			const { getApiKeyScope } = useApiKeyApi();
			const [result, setResult] = React.useState<string | null>(null);

			React.useEffect(() => {
				const fetchData = async () => {
					const { data } = await getApiKeyScope();
					setResult(JSON.stringify(data));
				};
				fetchData();
			}, [getApiKeyScope]);

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe(
				'{"organization_id":"org-id","project_id":null,"environment_id":null}'
			);
		});
	});

	it('validates a valid API key', async () => {
		(tokenType as vi.Mock).mockReturnValue(TokenType.APIToken);

		(fetch as any).mockResolvedValueOnce({
			...getMockFetchResponse(),
			json: async () => ({
					organization_id: 'org-id',
					project_id: 'project-id',
					environment_id: null,
			})
		});

		const TestComponent = () => {
			const { validateApiKeyScope } = useApiKeyApi();
			const [result, setResult] = React.useState<string | null>(null);

			React.useEffect(() => {
				const validateScope = async () => {
					const { scope: data }  = await validateApiKeyScope('valid-api-key', 'project');
					setResult(JSON.stringify(data));
				};
				validateScope();
			}, [validateApiKeyScope]);

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe(
				'{"organization_id":"org-id","project_id":"project-id","environment_id":null}'
			);
		});
	});

	it('invalidates an incorrect API key', async () => {
		vi.mocked(tokenType).mockReturnValue(TokenType.Invalid);

		// (fetch as any).mockResolvedValueOnce({
		// 	...getMockFetchResponse(),
		// 	json: async () => ({
		// 		data: null,
		// 		error: 'Invalid API Key'
		// 	})
		// });

		const TestComponent = () => {
			const { validateApiKeyScope } = useApiKeyApi();
			const [result, setResult] = React.useState<string | null>(null);

			React.useEffect(() => {
				const validateScope = async () => {
					const { scope: data, error } = await validateApiKeyScope('invalid-key', 'project');
					setResult(JSON.stringify({ data, error }));
				};
				validateScope();
			}, [validateApiKeyScope]);

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe(
				'{"data":null,"error":"Please provide a valid api key"}'
			);
		});
	});

	it('validates an API key scope for organization level', async () => {
		const apiKey = 'valid-api-key';

		(fetch as any).mockResolvedValueOnce({
			...getMockFetchResponse(),
			json: async () => ({
					organization_id: 'org-id',
					project_id: null,
					environment_id: null
			})
		});

		vi.mocked(tokenType).mockReturnValue(TokenType.APIToken);

		const TestComponent = () => {
			const { validateApiKeyScope } = useApiKeyApi();
			const [result, setResult] = React.useState<string | null>(null);

			React.useEffect(() => {
				const validate = async () => {
					const { scope: data } = await validateApiKeyScope(apiKey, 'organization');
					setResult(JSON.stringify(data));
				};
				validate();
			}, [validateApiKeyScope]);

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe(
				'{"organization_id":"org-id","project_id":null,"environment_id":null}'
			);
		});
	});

	it('handles invalid API key in validateApiKeyScope', async () => {
		const apiKey = 'invalid-api-key';

		(fetch as any).mockResolvedValueOnce({
			...getMockFetchResponse(),
			json: async () => ({
				error: 'Invalid API key',
				data: null,
			})
		});
		(tokenType as any).mockReturnValue(TokenType.Invalid);

		const TestComponent = () => {
			const { validateApiKeyScope } = useApiKeyApi();
			const [result, setResult] = React.useState<string | null>(null);

			React.useEffect(() => {
				const validate = async () => {
					const {  error } = await validateApiKeyScope(apiKey, 'organization');
					setResult(JSON.stringify({  error }));
				};
				validate();
			}, [validateApiKeyScope]);

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe(
				'{"error":"Please provide a valid api key"}'
			);
		});
	});
});
