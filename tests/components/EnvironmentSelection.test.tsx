import { vi, it, describe, expect, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import EnvironmentSelection from '../../source/components/EnvironmentSelection.js';
import delay from 'delay';
import * as keytar from 'keytar';

vi.mock('keytar', () => {
	const demoPermitKey = 'permit_key_'.concat('a'.repeat(97));

	const keytar = {
		setPassword: vi.fn().mockResolvedValue(() => {
			return demoPermitKey
		}),
		getPassword: vi.fn().mockResolvedValue(() => {
			return demoPermitKey
		}),
		deletePassword: vi.fn().mockResolvedValue(demoPermitKey),
	};
	return { ...keytar, default: keytar };
});

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
			data: {
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
			data: {
				name: 'Test Org',
				id: 'org1',
			},
		}),
	}),
}));

vi.mock('../../source/hooks/useApiKeyApi', () => ({
	useApiKeyApi: () => ({
		getApiKeyScope: vi.fn().mockResolvedValue({
			data: {
				environment_id: 'env1',
				project_id: 'proj1',
				organization_id: 'org1',
			},
			error: null,
			status: 200,
		}),
		getProjectEnvironmentApiKey: vi.fn().mockResolvedValue({
			data: { secret: 'test-secret' },
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
