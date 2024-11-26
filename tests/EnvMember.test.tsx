import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Member from '../source/commands/env/member.js';
import { TokenType, tokenType } from '../source/lib/auth.js';
import EnvironmentSelection from '../source/components/EnvironmentSelection.js';
import { Form } from 'ink-form';
import delay from 'delay';

vi.mock('../source/lib/auth.js', () => ({
	TokenType: {
		APIToken: 'APIToken',
	},
	tokenType: vi.fn(),
}));

vi.mock('../source/hooks/useApiKeyApi.js', () => ({
	useApiKeyApi: vi.fn(() => ({
		getApiKeyScope: vi.fn(() =>
			Promise.resolve({
				response: { project_id: 'project1', environment_id: null },
				error: null,
			}),
		),
	})),
}));

vi.mock('../source/hooks/useMemberApi.js', () => ({
	useMemberApi: vi.fn(() => ({
		inviteNewMember: vi.fn(() =>
			Promise.resolve({
				error: null,
			}),
		),
	})),
}));

vi.mock('../source/components/EnvironmentSelection.js', () => ({
	__esModule: true,
	default: vi.fn(),
}));

vi.mock('ink-form', () => ({
	Form: vi.fn(),
}));

beforeEach(() => {
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

		const { lastFrame } = render(
			<Member options={{ key: 'valid_api_key' }} />,
		);

		expect(lastFrame()).toMatch(/Loading your environment/);
	});

	it('should validate API key and transition to selecting state', async () => {
		vi.mocked(tokenType).mockReturnValue(TokenType.APIToken);

		const { lastFrame } = render(
			<Member options={{ key: 'valid_api_key' }} />,
		);

		await delay(50); // Allow async operation to complete

		expect(lastFrame()).not.toMatch(/Loading your environment/);
		expect(EnvironmentSelection).toHaveBeenCalled();
	});

	it('should handle invalid API key', async () => {
		vi.mocked(tokenType).mockReturnValue(TokenType.Invalid);

		const { lastFrame } = render(
			<Member options={{ key: 'invalid_api_key' }} />,
		);

		await delay(50); // Allow async operation to complete

		expect(lastFrame()).toMatch(/Invalid API Key. Please provide a valid API Key./);
		expect(process.exit).toHaveBeenCalledWith(1);
	});

	it('should display success message after member invitation', async () => {
		vi.mocked(tokenType).mockReturnValue(TokenType.APIToken);
		// @ts-ignore
		EnvironmentSelection.mockImplementation(({ onComplete }) => {
			onComplete(
				{ label: 'Org1', value: 'org1' }, // Organisation
				{ label: 'Project1', value: 'project1' }, // Project
				{ label: 'Environment1', value: 'env1' }, // Environment
				'secret_token',
			);
			return null;
		});

		// @ts-ignore
		Form.mockImplementation(({ onSubmit }) => {
			onSubmit({
				memberEmail: 'test@example.com',
				memberRole: 'admin',
			});
			return null;
		});

		const { lastFrame } = render(
			<Member options={{ key: 'valid_api_key' }} />,
		);

		await delay(50); // Allow async operation to complete

		expect(lastFrame()).toMatch(/User Invited Successfully !/);
	});
});
