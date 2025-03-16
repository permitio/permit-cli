import React from 'react';
import { describe, vi, it, expect, beforeEach } from 'vitest';
import ListComponent from '../../source/components/env/template/ListComponent';
import { getFiles } from '../../source/lib/env/template/utils';
import { render } from 'ink-testing-library';

vi.mock('../../source/lib/env/template/utils', () => ({
	getFiles: vi.fn(),
}));

describe('List Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders the files', async () => {
		(getFiles as vi.Mock).mockReturnValue(['template1', 'template2']);
		const { lastFrame } = render(ListComponent());
		expect(lastFrame()).toContain('Templates List');
		expect(lastFrame()).toContain(' • template1');
		expect(lastFrame()).toContain(' • template2');
	});

	it('displays empty file message', async () => {
		(getFiles as vi.Mock).mockReturnValue(null);
		const { lastFrame } = render(ListComponent());
		expect(lastFrame()).toContain('No Templates found.');
	});
});
