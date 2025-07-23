import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TrinoComponent from '../../../../source/components/env/trino/TrinoComponent.js';
import type { TrinoOptions } from '../../../../source/components/env/trino/types.js';

// Mock the useTrinoProcessor hook
vi.mock('../../../../source/hooks/trino/useTrinoProcessor.js', () => ({
	useTrinoProcessor: vi.fn(),
}));

// Mock the dynamic import of trinoUtils
vi.mock('../../../../source/utils/trinoUtils.js', () => ({
	connectToTrino: vi.fn(() => ({})),
	fetchTrinoSchema: vi.fn(() => ({})),
	mapTrinoSchemaToPermitResources: vi.fn(() => []),
}));

import { useTrinoProcessor } from '../../../../source/hooks/trino/useTrinoProcessor.js';

describe('TrinoComponent', () => {
	const mockOptions: TrinoOptions = {
		url: 'http://localhost:8080',
		user: 'testuser',
		password: 'testpass',
		catalog: 'postgresql',
		schema: 'public',
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render ready state initially', () => {
		(useTrinoProcessor as any).mockReturnValue({
			processTrinoSchema: vi.fn(),
			status: 'idle',
			errorMessage: '',
		});

		const { lastFrame } = render(<TrinoComponent {...mockOptions} />);
		expect(lastFrame()).toContain('Ready to process Trino schema');
	});

	it('should render processing state', () => {
		(useTrinoProcessor as any).mockReturnValue({
			processTrinoSchema: vi.fn(),
			status: 'processing',
			errorMessage: '',
		});

		const { lastFrame } = render(<TrinoComponent {...mockOptions} />);
		expect(lastFrame()).toContain(
			'Processing Trino schema and syncing with Permit',
		);
	});

	it('should render error state with error message', () => {
		const errorMessage = 'Connection failed';
		(useTrinoProcessor as any).mockReturnValue({
			processTrinoSchema: vi.fn(),
			status: 'error',
			errorMessage,
		});

		const { lastFrame } = render(<TrinoComponent {...mockOptions} />);
		expect(lastFrame()).toContain('Error: Connection failed');
	});

	it('should render success state', () => {
		(useTrinoProcessor as any).mockReturnValue({
			processTrinoSchema: vi.fn(),
			status: 'done',
			errorMessage: '',
		});

		const { lastFrame } = render(<TrinoComponent {...mockOptions} />);
		expect(lastFrame()).toContain(
			'Trino schema successfully synced with Permit',
		);
	});

	it('should call processTrinoSchema on mount with props', async () => {
		const mockProcessTrinoSchema = vi.fn();
		(useTrinoProcessor as any).mockReturnValue({
			processTrinoSchema: mockProcessTrinoSchema,
			status: 'idle',
			errorMessage: '',
		});

		render(<TrinoComponent {...mockOptions} />);
		await vi.waitFor(() => {
			expect(mockProcessTrinoSchema).toHaveBeenCalledWith(mockOptions);
		});
	});

	it('should handle undefined status gracefully', () => {
		(useTrinoProcessor as any).mockReturnValue({
			processTrinoSchema: vi.fn(),
			status: undefined,
			errorMessage: '',
		});

		const { lastFrame } = render(<TrinoComponent {...mockOptions} />);
		expect(lastFrame()).toContain('Ready to process Trino schema');
	});

	it('should handle empty error message in error state', () => {
		(useTrinoProcessor as any).mockReturnValue({
			processTrinoSchema: vi.fn(),
			status: 'error',
			errorMessage: '',
		});

		const { lastFrame } = render(<TrinoComponent {...mockOptions} />);
		expect(lastFrame()).toContain('Error:');
	});
});
