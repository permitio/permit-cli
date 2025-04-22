import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import delay from 'delay';
import { loadAuthToken } from '../../source/lib/auth';
import Run from '../../source/commands/pdp/run';
import PDPRunComponent from '../../source/components/pdp/PDPRunComponent';
import { never } from 'zod';

// Mock process.exit to prevent tests from actually exiting
const mockExit = vi.spyOn(process, 'exit').mockImplementation(code => {
	return undefined as never;
});

// Mock child_process.exec
vi.mock('node:child_process', () => ({
	exec: vi.fn(),
}));

// Mock util.promisify
vi.mock('node:util', () => ({
	promisify: vi.fn().mockImplementation(fn => {
		return async cmd => {
			if (cmd && cmd.includes('docker inspect')) {
				return { stdout: '/pdp-container\n' };
			}
			return { stdout: 'container123\n' };
		};
	}),
}));

// Mock the auth module
vi.mock('../../source/lib/auth', () => ({
	loadAuthToken: vi.fn(),
}));

// Mock the API key hooks
vi.mock('../../source/hooks/useApiKeyApi', async () => {
	const original = await vi.importActual('../../source/hooks/useApiKeyApi');
	return {
		...original,
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
			validateApiKeyScope: vi.fn().mockResolvedValue({
				valid: true,
				scope: {
					environment_id: 'env1',
					project_id: 'proj1',
					organization_id: 'org1',
				},
				error: null,
			}),
		}),
	};
});

// Mock the AuthProvider context
vi.mock('../../source/components/AuthProvider', () => ({
	useAuth: () => ({
		authToken: 'mock-auth-token',
	}),
}));

// Mock fetch API with controlled timing
global.fetch = vi.fn().mockImplementation(() =>
	Promise.resolve({
		ok: true,
		json: () => Promise.resolve({ controlPlane: 'https://api.permit.io' }),
		statusText: 'OK',
	}),
);

describe('PDP Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(loadAuthToken as any).mockResolvedValue('permit_key_' + 'a'.repeat(97));
	});

	it('should attempt to exit process when no callbacks are provided', async () => {
		try {
			render(<PDPRunComponent />);
			await delay(500);
		} catch (error) {
			expect(error.message).toContain('Process.exit called with code 0');
		}
		expect(mockExit).toHaveBeenCalledWith(0);
	});

	it('should call onComplete when operation completes with skipWaitScreen', async () => {
		const onComplete = vi.fn();
		render(<PDPRunComponent onComplete={onComplete} skipWaitScreen={true} />);

		await delay(100);
		expect(onComplete).toHaveBeenCalled();
	});

	it('should show continue button when skipWaitScreen is false', async () => {
		const onComplete = vi.fn();
		const { lastFrame } = render(
			<PDPRunComponent onComplete={onComplete} skipWaitScreen={false} />,
		);

		await delay(100);
		const output = lastFrame()?.toString() || '';
		expect(output).toContain('Continue');
		expect(onComplete).not.toHaveBeenCalled();
	});

	it('should call onError when an error occurs', async () => {
		// Mock fetch to fail
		global.fetch = vi.fn().mockImplementation(() =>
			Promise.resolve({
				ok: false,
				statusText: 'Unauthorized',
			}),
		);

		const onError = vi.fn();
		render(<PDPRunComponent onError={onError} />);

		await delay(100);
		expect(onError).toHaveBeenCalled();
		expect(onError.mock.calls[0][0]).toContain(
			'Failed to fetch PDP configuration',
		);

		// Reset the fetch mock
		global.fetch = vi.fn().mockImplementation(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ controlPlane: 'https://api.permit.io' }),
				statusText: 'OK',
			}),
		);
	});

	it('should show docker command in dry run mode', async () => {
		const { lastFrame } = render(<PDPRunComponent dryRun={true} />);

		await delay(100);
		const output = lastFrame()?.toString() || '';
		expect(output).toContain(
			'Run the following command to start the PDP container',
		);
		expect(output).toContain('docker run');
	});
});
