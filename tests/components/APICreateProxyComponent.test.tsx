import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import delay from 'delay';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CreateProxyConfigComponent from '../../source/components/api/proxy/APICreateProxyComponent';
import type { Mock } from 'vitest';

// Extend globalThis for TypeScript
declare global {
	var submitValue: ((value: string) => void) | undefined;
}

type MockCreate = Mock<(...args: any[]) => Promise<void>>;

// Mock TextInput component
vi.mock('ink-text-input', () => ({
	default: ({ value, onChange, onSubmit }: any) => {
		// expose submit handler
		global.submitValue = (val: string) => {
			onChange(val);
			onSubmit(val);
		};
		return <Text>TextInput-{value}</Text>;
	},
}));

// Mock Spinner
vi.mock('ink-spinner', () => ({
	default: () => <Text>Spinner</Text>,
}));

// Holders for hook mocks
let mockPayload: any;
let mockParseError: string | null;
let mockStatus: string;
let mockErrorMsg: string | null;
let mockCreate: MockCreate;
let formatErrorCalls: string[];

beforeEach(() => {
	mockPayload = { auth_mechanism: 'Basic', mapping_rules: ['r1'] };
	mockParseError = null;
	mockStatus = 'input';
	mockErrorMsg = null;
	formatErrorCalls = [];

	mockCreate = vi.fn().mockImplementation(async () => Promise.resolve());

	// Mock useParseProxyData
	vi.mock('../../source/hooks/useParseProxyData.js', () => ({
		useParseProxyData: () => ({
			payload: mockPayload,
			parseError: mockParseError,
		}),
	}));

	// Mock useCreateProxy
	vi.mock('../../source/hooks/useCreateProxy.js', () => ({
		useCreateProxy: (_proj: string, _env: string, apiKey?: string) => ({
			status: mockStatus,
			errorMessage: mockErrorMsg,
			createProxy: mockCreate,
			formatErrorMessage: (msg: string) => {
				formatErrorCalls.push(msg);
				return `Formatted: ${msg}`;
			},
			setStatus: (s: string) => {
				mockStatus = s;
			},
			setErrorMessage: (e: string | null) => {
				mockErrorMsg = e;
			},
		}),
	}));

	// Mock useAuth
	vi.mock('../../source/components/AuthProvider.js', () => ({
		useAuth: () => ({ scope: { project_id: 'proj', environment_id: 'env' } }),
	}));
});

afterEach(() => {
	vi.clearAllMocks();
	if (global.submitValue) delete global.submitValue;
});

const waitFor = (ms = 100) => delay(ms);

describe('CreateProxyConfigComponent', () => {
	it('should render key input when no options provided', async () => {
		const { lastFrame } = render(<CreateProxyConfigComponent options={{}} />);
		await waitFor();
		expect(lastFrame()).toContain('Proxy Key is required');
		expect(lastFrame()).toContain('TextInput-');
	});

	it('should sequence through inputs and trigger create', async () => {
		// initial render prompts key
		render(<CreateProxyConfigComponent options={{}} />);
		await waitFor();

		// submit key
		global.submitValue && global.submitValue('my-key');
		await waitFor();

		// now prompt secret
		expect(mockStatus).toBe('input');
		expect(global.submitValue).toBeDefined();

		global.submitValue && global.submitValue('my-secret');
		await waitFor();

		// now prompt name
		global.submitValue && global.submitValue('my-name');
		await waitFor();

		// After name, status should change to processing
		expect(mockStatus).toBe('processing');
		// createProxy should have been called with correct payload
		expect(mockCreate).toHaveBeenCalledWith({
			key: 'my-key',
			secret: 'my-secret',
			name: 'my-name',
			auth_mechanism: 'Basic',
			mapping_rules: ['r1'],
		});
	});

	it('should show processing spinner', async () => {
		mockStatus = 'processing';
		const { lastFrame } = render(
			<CreateProxyConfigComponent
				options={{ key: 'k', secret: 's', name: 'n' }}
			/>,
		);
		await waitFor();
		expect(lastFrame()).toContain('Spinner');
		expect(lastFrame()).toContain('Creating proxy config');
	});

	it('should display success message on done', async () => {
		mockStatus = 'done';
		const { lastFrame } = render(
			<CreateProxyConfigComponent
				options={{ key: 'k', secret: 's', name: 'n' }}
			/>,
		);
		await waitFor();
		expect(lastFrame()).toContain('Proxy Config created successfully');
	});

	it('should show formatted error on error status', async () => {
		mockStatus = 'error';
		mockErrorMsg = 'bad error';
		const { lastFrame } = render(
			<CreateProxyConfigComponent
				options={{ key: 'k', secret: 's', name: 'n' }}
			/>,
		);
		await waitFor();
		expect(formatErrorCalls).toContain('bad error');
		expect(lastFrame()).toContain('Error: Formatted: bad error');
	});

	it('should error out immediately if parseError exists', async () => {
		mockParseError = 'parse failed';
		const { lastFrame } = render(
			<CreateProxyConfigComponent
				options={{ key: 'k', secret: 's', name: 'n' }}
			/>,
		);
		await waitFor();
		expect(lastFrame()).toContain('Error: Formatted: parse failed');
	});
});
