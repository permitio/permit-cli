import { vi, it, describe, expect, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import EnvironmentSelection from '../../source/components/EnvironmentSelection';
import delay from 'delay';
import { useAuthApi } from '../../source/hooks/useAuthApi';
import { useApiKeyApi } from '../../source/hooks/useApiKeyApi';
import { useEnvironmentApi } from '../../source/hooks/useEnvironmentApi';
import { useOrganisationApi } from '../../source/hooks/useOrganisationApi';
import { apiCall } from '../../source/lib/api';
import { g } from 'vitest/dist/chunks/suite.B2jumIFP.js';
vi.mock('../../source/lib/api', () => ({
	apiCall: vi.fn(),
}));

vi.mock('../../source/hooks/useAuthApi', () => ({
	useAuthApi: () => ({
		authSwitchOrgs: vi.fn().mockResolvedValue({
			headers: {
				getSetCookie: () => ['new-cookie'],
			},
			error: null,
		}),
	}),
}));

vi.mock('../../source/hooks/useEnvironmentApi', () => ({
	useEnvironmentApi: () => ({
		getEnvironment: vi.fn().mockResolvedValue({
			response: {
				name: 'Test Env',
				id: 'env1',
				project_id: 'proj1',
			},
		}),
	}),
}));

vi.mock('../../source/hooks/useOrganisationApi', () => ({
	useOrganisationApi: () => ({
		getOrg: vi.fn().mockResolvedValue({
			response: {
				name: 'Test Org',
				id: 'org1',
			},
		}),
	}),
}));

vi.mock('../../source/hooks/useApiKeyApi', () => ({
	useApiKeyApi: () => ({
		getApiKeyScope: vi.fn().mockResolvedValue({
			response: {
				environment_id: 'env1',
				project_id: 'proj1',
				organization_id: 'org1',
			},
			error: null,
			status: 200,
		}),
		getProjectEnvironmentApiKey: vi.fn().mockResolvedValue({
			response: { secret: 'test-secret' },
			error: null,
		}),
	}),
}));

describe('EnvironmentSelection', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should handle the where the scope has environment_id and project_id', async () => {
		await delay(100);
		const onComplete = vi.fn();
		const onError = vi.fn();

		render(
			<EnvironmentSelection
				accessToken="test-token"
				onComplete={onComplete}
				onError={onError}
			/>,
		);

		await delay(100);
		expect(onError).not.toHaveBeenCalled();
		expect(onComplete).toHaveBeenCalledWith(
			{ label: 'Test Org', value: 'org1' },
			{ label: '', value: 'proj1' },
			{ label: 'Test Env', value: 'env1' },
			'test-token',
		);
	});
});
