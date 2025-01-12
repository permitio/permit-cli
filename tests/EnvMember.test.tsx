import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Member from '../source/commands/env/member.js';
import { useApiKeyApi } from '../source/hooks/useApiKeyApi.js';
import { useMemberApi } from '../source/hooks/useMemberApi.js';
import EnvironmentSelection from '../source/components/EnvironmentSelection.js';
import delay from 'delay';
import * as keytar from "keytar"

vi.mock('../source/hooks/useApiKeyApi.js', () => ({
	useApiKeyApi: vi.fn(() => ({
		validateApiKeyScope: vi.fn(),
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
const demoPermitKey = 'permit_key_'.concat('a'.repeat(97));
vi.mock('keytar', () => {
	const demoPermitKey = 'permit_key_'.concat('a'.repeat(97));
	const keytar = {
		setPassword: vi.fn().mockResolvedValue(demoPermitKey),
		getPassword: vi.fn().mockResolvedValue(demoPermitKey),
		deletePassword: vi.fn().mockResolvedValue(demoPermitKey),

	};
	return { ...keytar, default: keytar };
});

beforeEach(() => {
	vi.restoreAllMocks();
	vi.spyOn(process, 'exit').mockImplementation(code => {
		console.warn(`Mocked process.exit(${code}) called`);
	});
});

afterEach(() => {
	vi.restoreAllMocks();
});

const enter = '\r';

describe('Member Component', () => {
	it('should handle successful member invite flow', async () => {
		vi.mocked(useApiKeyApi).mockReturnValue({
			validateApiKeyScope: vi.fn(() =>
				Promise.resolve({
					valid: true,
					scope: {
						organization_id: 'org1',
						project_id: 'proj1',
					},
					error: null,
				}),
			),
		});

		vi.mocked(useMemberApi).mockReturnValue({
			inviteNewMember: vi.fn(() =>
				Promise.resolve({
					error: null,
				}),
			),
		});

		vi.mocked(EnvironmentSelection).mockImplementation(({ onComplete }) => {
			onComplete(
				{ label: 'Org1', value: 'org1' },
				{ label: 'Proj1', value: 'proj1' },
				{ label: 'Env1', value: 'env1' },
			);
			return null;
		});

		const { lastFrame, stdin } = render(
			<Member options={{ key: 'valid_api_key' }} />,
		);

		await delay(100); // Allow environment selection

		stdin.write('user@example.com\n');
		await delay(50);
		stdin.write(enter);
		await delay(50);
		stdin.write(enter);
		await delay(100); // Allow role selection

		expect(lastFrame()).toMatch(/User Invited Successfully/);
	});

	it('should handle invalid API key gracefully', async () => {
		vi.mocked(useApiKeyApi).mockReturnValue({
			validateApiKeyScope: vi.fn(() =>
				Promise.resolve({
					valid: false,
					error: 'Invalid API Key',
				}),
			),
		});

		const { lastFrame } = render(
			<Member options={{ key: 'invalid_api_key' }} />,
		);

		await delay(50); // Allow async operations to complete

		expect(lastFrame()).toMatch(/Invalid API Key/);
		expect(process.exit).toHaveBeenCalledWith(1);
	});
});
