import { useApiKeyApi } from '../../source/hooks/useApiKeyApi';
import { apiCall } from '../../source/lib/api';
import { TokenType, tokenType } from '../../source/lib/auth';
import { vi, expect, it, describe, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';

vi.mock('../../source/lib/api', () => ({
	apiCall: vi.fn(),
}));

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
		const projectId = 'test-project-id';
		const environmentId = 'test-environment-id';
		const cookie = 'test-cookie';
		const accessToken = 'test-access-token';
		const mockResponse = { data: 'mock-data' };

		(apiCall as any).mockResolvedValue(mockResponse);

		const TestComponent = () => {
			const { getProjectEnvironmentApiKey } = useApiKeyApi();
			const [result, setResult] = React.useState<string | null>(null);

			React.useEffect(() => {
				const fetchData = async () => {
					const data = await getProjectEnvironmentApiKey(
						projectId,
						environmentId,
						cookie,
						accessToken,
					);
					setResult(JSON.stringify(data));
				};
				fetchData();
			}, [getProjectEnvironmentApiKey]);

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			const frame = lastFrame();
			expect(frame).toBe('{"data":"mock-data"}');
		});

		expect(apiCall).toHaveBeenCalledWith(
			`v2/api-key/${projectId}/${environmentId}`,
			accessToken,
			cookie,
		);
	});

	it('Calls getApiKeyScope and fetches the API key scope', async () => {
		const accessToken = 'test-access-token';
		const mockResponse = {
			organization_id: 'org-id',
			project_id: null,
			environment_id: null,
		};

		(apiCall as any).mockResolvedValue(mockResponse);

		const TestComponent = () => {
			const { getApiKeyScope } = useApiKeyApi();
			const [result, setResult] = React.useState<string | null>(null);

			React.useEffect(() => {
				const fetchData = async () => {
					const data = await getApiKeyScope(accessToken);
					setResult(JSON.stringify(data));
				};
				fetchData();
			}, [getApiKeyScope]);

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			const frame = lastFrame();
			expect(frame).toBe(
				'{"organization_id":"org-id","project_id":null,"environment_id":null}',
			);
		});

		expect(apiCall).toHaveBeenCalledWith('v2/api-key/scope', accessToken);
	});

	it('validates a valid API key', async () => {
		(tokenType as vi.Mock).mockReturnValue(TokenType.APIToken);

		const mockScope = {
			organization_id: 'org-id',
			project_id: 'project-id',
			environment_id: null,
		};

		(apiCall as vi.Mock).mockResolvedValue({
			response: mockScope,
			error: null,
		});

		const TestComponent = () => {
			const { validateApiKeyScope } = useApiKeyApi();
			const [result, setResult] = React.useState<string | null>(null);

			React.useEffect(() => {
				const validateScope = async () => {
					const data = await validateApiKeyScope('valid-api-key', 'project');
					setResult(JSON.stringify(data));
				};
				validateScope();
			}, [validateApiKeyScope]);

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			const frame = lastFrame();
			expect(frame)
				.toBe(`{"valid":true,"scope":{"organization_id":"org-id","project_id":"project-id","environment_id":null},"
error":null}`);
		});

		expect(apiCall).toHaveBeenCalledWith('v2/api-key/scope', 'valid-api-key');
	});

	it('invalidates an incorrect API key', async () => {
		(tokenType as vi.Mock).mockReturnValue(TokenType.Invalid);

		(apiCall as vi.Mock).mockResolvedValue({
			response: null,
			error: 'Invalid API Key',
		});

		const TestComponent = () => {
			const { validateApiKeyScope } = useApiKeyApi();
			const [result, setResult] = React.useState<string | null>(null);

			React.useEffect(() => {
				const validateScope = async () => {
					const data = await validateApiKeyScope('invalid-key', 'project');
					setResult(JSON.stringify(data));
				};
				validateScope();
			}, [validateApiKeyScope]);

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			const frame = lastFrame();
			expect(frame).toBe(
				'{"valid":false,"scope":null,"error":"Please provide a valid api key"}',
			);
		});
	});

	it('validates an API key scope for organization level', async () => {
		const apiKey = 'valid-api-key';
		const mockScope = {
			organization_id: 'org-id',
			project_id: null,
			environment_id: null,
		};

		(apiCall as any).mockResolvedValue({ response: mockScope, error: null });
		(tokenType as any).mockReturnValue(TokenType.APIToken);

		const TestComponent = () => {
			const { validateApiKeyScope } = useApiKeyApi();
			const [result, setResult] = React.useState<string | null>(null);

			React.useEffect(() => {
				const validate = async () => {
					const validation = await validateApiKeyScope(apiKey, 'organization');
					setResult(JSON.stringify(validation));
				};
				validate();
			}, [validateApiKeyScope]);

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			const frame = lastFrame();
			expect(frame).toBe(
				`{"valid":true,"scope":{"organization_id":"org-id","project_id":null,"environment_id":null},"error":n
ull}`,
			);
		});

		expect(apiCall).toHaveBeenCalledWith('v2/api-key/scope', apiKey);
	});

	it('handles invalid API key in validateApiKeyScope', async () => {
		const apiKey = 'invalid-api-key';

		(apiCall as any).mockResolvedValue({
			response: null,
			error: 'Invalid API key',
		});
		(tokenType as any).mockReturnValue(TokenType.Invalid);

		const TestComponent = () => {
			const { validateApiKeyScope } = useApiKeyApi();
			const [result, setResult] = React.useState<string | null>(null);

			React.useEffect(() => {
				const validate = async () => {
					const validation = await validateApiKeyScope(apiKey, 'organization');
					setResult(JSON.stringify(validation));
				};
				validate();
			}, [validateApiKeyScope]);

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			const frame = lastFrame();
			expect(frame).toBe(
				'{"valid":false,"scope":null,"error":"Please provide a valid api key"}',
			);
		});
	});
});
