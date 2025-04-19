// File: tests/components/APICreateProxyComponent.test.tsx
import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import delay from 'delay';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CreateProxyConfigComponent from '../../source/components/api/proxy/APICreateProxyComponent';
import type { Mock } from 'vitest';

declare global {
	var submitValue: ((value: string) => void) | undefined;
}

type MockCreate = Mock<(...args: any[]) => Promise<void>>;

// ——— Mock TextInput ———
vi.mock('ink-text-input', () => ({
	default: ({ value, onChange, onSubmit }: any) => {
		global.submitValue = (val: string) => {
			onChange(val);
			onSubmit(val);
		};
		return <Text>TextInput-{value}</Text>;
	},
}));

// ——— Mock Spinner ———
vi.mock('ink-spinner', () => ({
	default: () => <Text>Spinner</Text>,
}));

// ——— Hook Mocks Placeholders ———
let mockPayload: any;
let mockParseError: string | null;
let mockStatus: string;
let mockErrorMsg: string | null;
let mockCreate: MockCreate;
let mockFormatCalls: string[];

// ——— Mock useParseProxyData ———
vi.mock('../../source/hooks/useParseProxyData.js', () => ({
	useParseProxyData: () => ({
		payload: mockPayload,
		parseError: mockParseError,
	}),
}));

// ——— Mock useCreateProxy ———
vi.mock('../../source/hooks/useCreateProxy.js', () => ({
	useCreateProxy: () => ({
		status: mockStatus,
		errorMessage: mockErrorMsg,
		createProxy: mockCreate,
		formatErrorMessage: (msg: string) => {
			mockFormatCalls.push(msg);
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

// ——— Mock useAuth ———
vi.mock('../../source/components/AuthProvider.js', () => ({
	useAuth: () => ({ scope: { project_id: 'proj', environment_id: 'env' } }),
}));

const wait = (ms = 50) => delay(ms);

beforeEach(() => {
	mockPayload = { auth_mechanism: 'Basic', mapping_rules: ['r1'] };
	mockParseError = null;
	mockStatus = 'input';
	mockErrorMsg = null;
	mockCreate = vi.fn().mockResolvedValue(undefined);
	mockFormatCalls = [];
});

afterEach(() => {
	vi.clearAllMocks();
	delete global.submitValue;
});

describe('CreateProxyConfigComponent', () => {
	it('flows through inputs and calls createProxy with correct payload', async () => {
		render(<CreateProxyConfigComponent options={{}} />);
		await wait();

		global.submitValue!('my-key');
		await wait();

		global.submitValue!('my-secret');
		await wait();

		global.submitValue!('my-name');
		await wait();

		global.submitValue!('n');
		await wait();

		expect(mockCreate).toHaveBeenCalledWith({
			key: 'my-key',
			secret: 'my-secret',
			name: 'my-name',
			auth_mechanism: 'Basic',
			mapping_rules: ['r1'],
		});
	});

	it('still shows the mapping-start prompt on mount even if status is "processing"', async () => {
		mockStatus = 'processing';
		const { lastFrame } = render(
			<CreateProxyConfigComponent
				options={{ key: 'k', secret: 's', name: 'n' }}
			/>,
		);
		await wait();
		expect(lastFrame()).toContain(
			'Would you like to add mapping rules? (y/n):',
		);
	});

	it('still shows the mapping-start prompt on mount even if status is "done"', async () => {
		mockStatus = 'done';
		const { lastFrame } = render(
			<CreateProxyConfigComponent
				options={{ key: 'k', secret: 's', name: 'n' }}
			/>,
		);
		await wait();
		expect(lastFrame()).toContain(
			'Would you like to add mapping rules? (y/n):',
		);
	});

	it('still shows the mapping-start prompt on mount even if status is "error"', async () => {
		mockStatus = 'error';
		mockErrorMsg = 'bad error';
		const { lastFrame } = render(
			<CreateProxyConfigComponent
				options={{ key: 'k', secret: 's', name: 'n' }}
			/>,
		);
		await wait();
		expect(mockFormatCalls).toContain('bad error');
		expect(lastFrame()).toContain(
			'Would you like to add mapping rules? (y/n):',
		);
	});

	it('still shows the mapping-start prompt on mount even if parseError exists', async () => {
		mockParseError = 'parse failed';
		const { lastFrame } = render(
			<CreateProxyConfigComponent
				options={{ key: 'k', secret: 's', name: 'n' }}
			/>,
		);
		await wait();
		expect(lastFrame()).toContain(
			'Would you like to add mapping rules? (y/n):',
		);
	});
});
