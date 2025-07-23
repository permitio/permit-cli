import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTrinoProcessor } from '../../../source/hooks/trino/useTrinoProcessor.js';
import type { TrinoOptions } from '../../../source/components/env/trino/types.js';

// Mock the trinoUtils functions
vi.mock('../../../source/utils/trinoUtils.js', () => ({
	connectToTrino: vi.fn(),
	fetchTrinoSchema: vi.fn(),
	mapTrinoSchemaToPermitResources: vi.fn(),
}));

// Mock the useResourcesApi hook
vi.mock('../../../source/hooks/useResourcesApi.js', () => ({
	useResourcesApi: vi.fn(),
}));

import {
	connectToTrino,
	fetchTrinoSchema,
	mapTrinoSchemaToPermitResources,
} from '../../../source/utils/trinoUtils.js';
import { useResourcesApi } from '../../../source/hooks/useResourcesApi.js';

describe('useTrinoProcessor', () => {
	const mockOptions: TrinoOptions = {
		url: 'http://localhost:8080',
		user: 'testuser',
		password: 'testpass',
		catalog: 'postgresql',
		schema: 'public',
		insecure: false,
	};

	const mockTrinoClient = {
		baseUrl: 'http://localhost:8080',
		headers: { 'X-Trino-User': 'testuser' },
	};

	const mockTrinoSchema = {
		catalogs: [{ name: 'postgresql' }],
		schemas: [{ catalog: 'postgresql', name: 'public' }],
		tables: [
			{
				catalog: 'postgresql',
				schema: 'public',
				name: 'users',
				type: 'BASE TABLE',
				columns: [
					{ name: 'id', type: 'integer', nullable: false },
					{ name: 'email', type: 'varchar', nullable: false },
				],
			},
		],
	};

	const mockPermitResources = [
		{
			key: 'postgresql',
			name: 'postgresql',
			description: 'Trino catalog: postgresql',
			actions: ['access_catalog', 'show_schemas'],
		},
		{
			key: 'postgresql|public|users',
			name: 'postgresql.public.users',
			description: 'BASE TABLE users in postgresql.public',
			actions: ['select', 'insert', 'update', 'delete'],
			attributes: {
				id: { type: 'number', description: undefined },
				email: { type: 'string', description: undefined },
			},
		},
	];

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should process Trino schema successfully', async () => {
		const mockCreateBulkResources = vi.fn().mockResolvedValue(undefined);
		(useResourcesApi as any).mockReturnValue({
			createBulkResources: mockCreateBulkResources,
			status: 'idle',
			errorMessage: '',
		});

		(connectToTrino as any).mockReturnValue(mockTrinoClient);
		(fetchTrinoSchema as any).mockResolvedValue(mockTrinoSchema);
		(mapTrinoSchemaToPermitResources as any).mockReturnValue(
			mockPermitResources,
		);

		const TestComponent = () => {
			const { processTrinoSchema } = useTrinoProcessor();
			const [result, setResult] = React.useState<string>('');

			React.useEffect(() => {
				processTrinoSchema(mockOptions)
					.then(() => setResult('success'))
					.catch(() => setResult('error'));
			}, []);

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('success');
		});

		expect(connectToTrino).toHaveBeenCalledWith(mockOptions);
		expect(fetchTrinoSchema).toHaveBeenCalledWith(mockTrinoClient, {
			catalog: 'postgresql',
			schema: 'public',
		});
		expect(mapTrinoSchemaToPermitResources).toHaveBeenCalledWith(
			mockTrinoSchema,
		);
		expect(mockCreateBulkResources).toHaveBeenCalledWith([
			{
				key: 'postgresql',
				name: 'postgresql',
				description: 'Trino catalog: postgresql',
				actions: { access_catalog: {}, show_schemas: {} },
			},
			{
				key: 'postgresql|public|users',
				name: 'postgresql.public.users',
				description: 'BASE TABLE users in postgresql.public',
				actions: { select: {}, insert: {}, update: {}, delete: {} },
				attributes: {
					id: { type: 'number', description: undefined },
					email: { type: 'string', description: undefined },
				},
			},
		]);
	});

	it('should handle connection errors', async () => {
		const mockCreateBulkResources = vi.fn();
		(useResourcesApi as any).mockReturnValue({
			createBulkResources: mockCreateBulkResources,
			status: 'idle',
			errorMessage: '',
		});

		const connectionError = new Error('Connection failed');
		(connectToTrino as any).mockImplementation(() => {
			throw connectionError;
		});

		const TestComponent = () => {
			const { processTrinoSchema } = useTrinoProcessor();
			const [result, setResult] = React.useState<string>('');

			React.useEffect(() => {
				processTrinoSchema(mockOptions)
					.then(() => setResult('success'))
					.catch(() => setResult('error'));
			}, []);

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('error');
		});

		expect(connectToTrino).toHaveBeenCalledWith(mockOptions);
		expect(fetchTrinoSchema).not.toHaveBeenCalled();
		expect(mapTrinoSchemaToPermitResources).not.toHaveBeenCalled();
		expect(mockCreateBulkResources).not.toHaveBeenCalled();
	});

	it('should handle schema fetching errors', async () => {
		const mockCreateBulkResources = vi.fn();
		(useResourcesApi as any).mockReturnValue({
			createBulkResources: mockCreateBulkResources,
			status: 'idle',
			errorMessage: '',
		});

		(connectToTrino as any).mockReturnValue(mockTrinoClient);
		const fetchError = new Error('Schema fetch failed');
		(fetchTrinoSchema as any).mockRejectedValue(fetchError);

		const TestComponent = () => {
			const { processTrinoSchema } = useTrinoProcessor();
			const [result, setResult] = React.useState<string>('');

			React.useEffect(() => {
				processTrinoSchema(mockOptions)
					.then(() => setResult('success'))
					.catch(() => setResult('error'));
			}, []);

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('error');
		});

		expect(connectToTrino).toHaveBeenCalledWith(mockOptions);
		expect(fetchTrinoSchema).toHaveBeenCalledWith(mockTrinoClient, {
			catalog: 'postgresql',
			schema: 'public',
		});
		expect(mapTrinoSchemaToPermitResources).not.toHaveBeenCalled();
		expect(mockCreateBulkResources).not.toHaveBeenCalled();
	});

	it('should handle resource creation errors', async () => {
		const mockCreateBulkResources = vi
			.fn()
			.mockRejectedValue(new Error('API failed'));
		(useResourcesApi as any).mockReturnValue({
			createBulkResources: mockCreateBulkResources,
			status: 'idle',
			errorMessage: '',
		});

		(connectToTrino as any).mockReturnValue(mockTrinoClient);
		(fetchTrinoSchema as any).mockResolvedValue(mockTrinoSchema);
		(mapTrinoSchemaToPermitResources as any).mockReturnValue(
			mockPermitResources,
		);

		const TestComponent = () => {
			const { processTrinoSchema } = useTrinoProcessor();
			const [result, setResult] = React.useState<string>('');

			React.useEffect(() => {
				processTrinoSchema(mockOptions)
					.then(() => setResult('success'))
					.catch(() => setResult('error'));
			}, []);

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('error');
		});

		expect(connectToTrino).toHaveBeenCalledWith(mockOptions);
		expect(fetchTrinoSchema).toHaveBeenCalledWith(mockTrinoClient, {
			catalog: 'postgresql',
			schema: 'public',
		});
		expect(mapTrinoSchemaToPermitResources).toHaveBeenCalledWith(
			mockTrinoSchema,
		);
		expect(mockCreateBulkResources).toHaveBeenCalled();
	});

	it('should handle options without catalog and schema', async () => {
		const mockCreateBulkResources = vi.fn().mockResolvedValue(undefined);
		(useResourcesApi as any).mockReturnValue({
			createBulkResources: mockCreateBulkResources,
			status: 'idle',
			errorMessage: '',
		});

		(connectToTrino as any).mockReturnValue(mockTrinoClient);
		(fetchTrinoSchema as any).mockResolvedValue(mockTrinoSchema);
		(mapTrinoSchemaToPermitResources as any).mockReturnValue(
			mockPermitResources,
		);

		const optionsWithoutFilters: TrinoOptions = {
			url: 'http://localhost:8080',
			user: 'testuser',
		};

		const TestComponent = () => {
			const { processTrinoSchema } = useTrinoProcessor();
			const [result, setResult] = React.useState<string>('');

			React.useEffect(() => {
				processTrinoSchema(optionsWithoutFilters)
					.then(() => setResult('success'))
					.catch(() => setResult('error'));
			}, []);

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('success');
		});

		expect(fetchTrinoSchema).toHaveBeenCalledWith(mockTrinoClient, {
			catalog: undefined,
			schema: undefined,
		});
	});

	it('should return status and error message from useResourcesApi', () => {
		(useResourcesApi as any).mockReturnValue({
			createBulkResources: vi.fn(),
			status: 'processing',
			errorMessage: 'Test error',
		});

		const TestComponent = () => {
			const { status, errorMessage } = useTrinoProcessor();
			return <Text>{`${status}:${errorMessage}`}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		expect(lastFrame()).toBe('processing:Test error');
	});

	it('should handle empty schema data', async () => {
		const mockCreateBulkResources = vi.fn().mockResolvedValue(undefined);
		(useResourcesApi as any).mockReturnValue({
			createBulkResources: mockCreateBulkResources,
			status: 'idle',
			errorMessage: '',
		});

		(connectToTrino as any).mockReturnValue(mockTrinoClient);
		(fetchTrinoSchema as any).mockResolvedValue({
			catalogs: [],
			schemas: [],
			tables: [],
		});
		(mapTrinoSchemaToPermitResources as any).mockReturnValue([]);

		const TestComponent = () => {
			const { processTrinoSchema } = useTrinoProcessor();
			const [result, setResult] = React.useState<string>('');

			React.useEffect(() => {
				processTrinoSchema(mockOptions)
					.then(() => setResult('success'))
					.catch(() => setResult('error'));
			}, []);

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('success');
		});

		expect(mockCreateBulkResources).toHaveBeenCalledWith([]);
	});
});
