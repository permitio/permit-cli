import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Member from '../source/commands/env/member.js';
import { TokenType, tokenType } from '../source/lib/auth.js';
import { useApiKeyApi } from '../source/hooks/useApiKeyApi.js';
import { useMemberApi } from '../source/hooks/useMemberApi.js';
import EnvironmentSelection from '../source/components/EnvironmentSelection.js';
import { TextInput } from '@inkjs/ui';
import SelectInput from 'ink-select-input';
import delay from 'delay';

vi.mock('../source/lib/auth.js', () => ({
	TokenType: {
		APIToken: 'APIToken',
	},
	tokenType: vi.fn(),
}));

vi.mock('../source/hooks/useApiKeyApi.js', () => ({
	useApiKeyApi: vi.fn(() => ({
		getApiKeyScope: vi.fn(),
	})),
}));

vi.mock('../source/hooks/useMemberApi.js', () => ({
	useMemberApi: vi.fn(() => ({
		inviteNewMember: vi.fn(),
	})),
}));

vi.mock('../source/components/EnvironmentSelection.js', () => ({
	__esModule: true,
	default: vi.fn(),
}));

vi.mock('@inkjs/ui', () => ({
	TextInput: vi.fn(),
}));

vi.mock('ink-select-input', () => ({
	__esModule: true,
	default: vi.fn(),
}));

beforeEach(() => {
	vi.restoreAllMocks();
	// @ts-ignore
	vi.spyOn(process, 'exit').mockImplementation((code) => {
		console.warn(`Mocked process.exit(${code}) called`);
	});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('Member Component', () => {
	it('should display loading state initially', () => {
		vi.mocked(tokenType).mockReturnValue(TokenType.APIToken);

		const { lastFrame } = render(<Member options={{ key: 'valid_api_key' }} />);

		expect(lastFrame()).toMatch(/Loading your environment/);
	});

	it('should handle invalid API key and display error', async () => {
		vi.mocked(tokenType).mockReturnValue(TokenType.Invalid);

		const { lastFrame } = render(<Member options={{ key: 'invalid_api_key' }} />);

		await delay(50); // Allow async operations to complete

		expect(lastFrame()).toMatch(/Invalid API Key. Please provide a valid API Key./);
		expect(process.exit).toHaveBeenCalledWith(1);
	});

	it('should handle successful member invitation and display success message', async () => {
		vi.mocked(tokenType).mockReturnValue(TokenType.APIToken);
		// @ts-ignore
		EnvironmentSelection.mockImplementation(({ onComplete }) => {
			onComplete(
				{ label: 'Org1', value: 'org1' },
				{ label: 'Project1', value: 'project1' },
				{ label: 'Environment1', value: 'env1' },
				'secret_token',
			);
			return null;
		});

		vi.mocked(useApiKeyApi).mockReturnValue({
			// @ts-ignore
			getApiKeyScope: vi.fn(() =>
				Promise.resolve({
					response: { project_id: 'project1', organisation_id: 'env1' },
					error: null,
				}),
			),
		});

		vi.mocked(useMemberApi).mockReturnValue({
			// @ts-ignore
			inviteNewMember: vi.fn(() =>
				Promise.resolve({
					error: null,
				}),
			),
		});
// @ts-ignore
		TextInput.mockImplementation(({ onSubmit }) => {
			setTimeout(() => onSubmit('test@example.com'), 10); // Simulate email input
			return null;
		});
// @ts-ignore
		SelectInput.mockImplementation(({ onSelect }) => {
			setTimeout(() => onSelect({ value: 'admin' }), 10); // Simulate role selection
			return null;
		});

		const { lastFrame } = render(<Member options={{ key: 'valid_api_key' }} />);

		await delay(100); // Allow async operations to complete

		expect(lastFrame()).toMatch(/User Invited Successfully !/);
	});

	it('should display error if member invitation fails', async () => {
		vi.mocked(tokenType).mockReturnValue(TokenType.APIToken);
// @ts-ignore
		EnvironmentSelection.mockImplementation(({ onComplete }) => {
			onComplete(
				{ label: 'Org1', value: 'org1' },
				{ label: 'Project1', value: 'project1' },
				{ label: 'Environment1', value: 'env1' },
				'secret_token',
			);
			return null;
		});

		vi.mocked(useApiKeyApi).mockReturnValue({
			// @ts-ignore
			getApiKeyScope: vi.fn(() =>
				Promise.resolve({
					response: { project_id: 'project1', organisation_id: 'env1' },
					error: null,
				}),
			),
		});

		vi.mocked(useMemberApi).mockReturnValue({
			// @ts-ignore
			inviteNewMember: vi.fn(() =>
				Promise.resolve({
					error: 'Invitation failed',
				}),
			),
		});
		// @ts-ignore
		TextInput.mockImplementation(({ onSubmit }) => {
			setTimeout(() => onSubmit('test@example.com'), 10); // Simulate email input
			return null;
		});
		// @ts-ignore
		SelectInput.mockImplementation(({ onSelect }) => {
			setTimeout(() => onSelect({ value: 'admin' }), 10); // Simulate role selection
			return null;
		});

		const { lastFrame } = render(<Member options={{ key: 'valid_api_key' }} />);

		await delay(100); // Allow async operations to complete

		expect(lastFrame()).toMatch(/Invitation failed/);
		expect(process.exit).toHaveBeenCalledWith(1);
	});
});
