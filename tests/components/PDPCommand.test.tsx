import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import PDPCommand from '../../source/components/PDPCommand';
import { AuthProvider } from '../../source/components/AuthProvider';
import delay from 'delay';
import { loadAuthToken } from '../../source/lib/auth';
vi.mock('../../source/lib/auth', () => ({
	loadAuthToken: vi.fn(),
}));
describe('PDP Component', () => {
	it('should render the PDP component with auth token', async () => {
		(loadAuthToken as any).mockResolvedValueOnce(
			'permit_key_'.concat('a'.repeat(97)),
		);
		const { lastFrame } = render(
			<AuthProvider>
				<PDPCommand opa={8181} />
			</AuthProvider>,
		);
		expect(lastFrame()?.toString()).toMatch('Loading Token');
		await delay(50);
		expect(lastFrame()?.toString()).toMatch(
			'Run the following command from your terminal:',
		);
	});
	it('should render the Spinner', async () => {
		const { lastFrame } = render(
			<AuthProvider>
				<PDPCommand opa={8181} />
			</AuthProvider>,
		);
		expect(lastFrame()?.toString()).toMatch('Loading Token');
		await delay(50);
		expect(lastFrame()?.toString()).toMatch('Loading command');
	});
});
