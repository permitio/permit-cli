import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import PDPRunComponent from '../../source/components/pdp/PDPRunComponent';
import { AuthProvider } from '../../source/components/AuthProvider';
import delay from 'delay';
import { loadAuthToken } from '../../source/lib/auth';
import Run from '../../source/commands/pdp/run';
import '../../source/i18n.ts';

vi.mock('../../source/lib/auth', () => ({
	loadAuthToken: vi.fn(),
}));

vi.mock('../../source/hooks/useApiKeyApi', async() => {
	const original = await vi.importActual('../../source/hooks/useApiKeyApi');
	return {
		...original,
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
			validateApiKeyScope: vi.fn().mockResolvedValue({
				valid: true,
				scope: {
					environment_id: 'env1',
					project_id: 'proj1',
					organization_id: 'org1',
				},
				error: null
			})
		}),
	}
});

describe('PDP Component', () => {
	it('should render the PDP component with auth token', async () => {
		(loadAuthToken as any).mockResolvedValueOnce(
			'permit_key_'.concat('a'.repeat(97)),
		);
		const { lastFrame } = render(
			<Run options={{ opa: 8181 }}/>
		);
		expect(lastFrame()?.toString()).toMatch('Loading Token');
		await delay(50);
		expect(lastFrame()?.toString()).toMatch(
			'Run the following command from your terminal:',
		);
	});
});
