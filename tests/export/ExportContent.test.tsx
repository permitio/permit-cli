import { expect, vi, describe, it, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { ExportContent } from '../../source/components/export/ExportContent.js'
import { getMockPermit, mockValidateApiKeyScope } from './mocks/permit.js';
import { mockUseAuth } from './mocks/hooks';

vi.mock('permitio', () => ({
	Permit: vi.fn(() => {
		return getMockPermit();
	}),
}));

vi.mock('../../source/hooks/useApiKeyApi', () => ({
	useApiKeyApi: () => ({ validateApiKeyScope: mockValidateApiKeyScope }),
}));

vi.mock('../../source/components/AuthProvider', () => ({
	useAuth: () => mockUseAuth(),
}));

describe('ExportContent', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('handles successful export to console', async () => {
		const { lastFrame } = render(
			<ExportContent options={{ key: 'test-key' }} />,
		);
		await vi.waitFor(() => {
			expect(lastFrame()).toContain('Export completed successfully!');
		});
	});

	it('handles validation errors', async () => {
		mockValidateApiKeyScope.mockResolvedValueOnce({
			valid: false,
			error: 'Invalid API key',
		});
		const { lastFrame } = render(
			<ExportContent options={{ key: 'invalid-key' }} />,
		);
		await vi.waitFor(() => {
			expect(lastFrame()).toContain('Invalid API key');
		});
	});
});
