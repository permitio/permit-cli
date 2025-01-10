import { expect, describe, it } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { ExportStatus } from '../../source/components/export/ExportStatus.js';

describe('ExportStatus', () => {
	it('shows loading state', () => {
		const { lastFrame } = render(
			<ExportStatus
				state={{
					status: 'Loading...',
					isComplete: false,
					error: null,
					warnings: [],
				}}
			/>,
		);
		expect(lastFrame()).toContain('Loading...');
	});

	it('shows error state', () => {
		const { lastFrame } = render(
			<ExportStatus
				state={{
					status: '',
					isComplete: false,
					error: 'Failed to export',
					warnings: [],
				}}
			/>,
		);
		expect(lastFrame()).toContain('Failed to export');
	});
});
