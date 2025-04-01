import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Clone, { options } from '../source/commands/gitops/env/clone';
import { AuthProvider } from '../source/components/AuthProvider';
import CloneComponent from '../source/components/gitops/CloneComponent';
import { Text } from 'ink';
import delay from 'delay';

// Mock the components
vi.mock('../source/components/AuthProvider', () => ({
	AuthProvider: vi.fn(({ children, scope, key }) => (
		<Text>
			AuthProvider scope={scope} key={key}
			{children}
		</Text>
	)),
}));

vi.mock('../source/components/gitops/CloneComponent', () => ({
	default: vi.fn(({ apiKey, dryRun, project }) => (
		<Text>
			CloneComponent apiKey={apiKey} dryRun={String(dryRun)} project=
			{String(project)}
		</Text>
	)),
}));

describe('Clone Command', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Component', () => {
		it('renders with default options', () => {
			const props = {
				options: {
					dryRun: false,
				},
			};

			const { lastFrame } = render(<Clone {...props} />);

			// Check rendered output instead of mock calls
			expect(lastFrame()).toContain('AuthProvider scope=project');
			expect(lastFrame()).toContain('CloneComponent');
			expect(lastFrame()).toContain('dryRun=false');
		});

		it('renders with all options provided', async () => {
			const props = {
				options: {
					apiKey: 'test-key',
					dryRun: true,
					project: true,
				},
			};

			const { lastFrame } = render(<Clone {...props} />);
			await delay(50);

			// Check rendered output
			expect(lastFrame()).toContain('AuthProvider scope=project ');
			expect(lastFrame()).toContain('CloneComponent');
			expect(lastFrame()).toContain('apiKey=test-key');
			expect(lastFrame()).toContain('dryRun=true');
			expect(lastFrame()).toContain('project=true');
		});
	});

	describe('Options Schema', () => {
		it('validates apiKey option', () => {
			const result = options.safeParse({
				apiKey: 'test-key',
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.apiKey).toBe('test-key');
			}
		});

		it('allows apiKey to be optional', () => {
			const result = options.safeParse({});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.apiKey).toBeUndefined();
			}
		});

		it('sets default value for dryRun', () => {
			const result = options.safeParse({});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.dryRun).toBe(false);
			}
		});

		it('allows overriding dryRun default', () => {
			const result = options.safeParse({
				dryRun: true,
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.dryRun).toBe(true);
			}
		});

		it('validates project option', () => {
			const result = options.safeParse({
				project: true,
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.project).toBe(true);
			}
		});

		it('allows project to be optional', () => {
			const result = options.safeParse({});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.project).toBeUndefined();
			}
		});

		it('validates all options together', () => {
			const result = options.safeParse({
				apiKey: 'test-key',
				dryRun: true,
				project: true,
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual({
					apiKey: 'test-key',
					dryRun: true,
					project: true,
				});
			}
		});

		it('rejects invalid types', () => {
			const result = options.safeParse({
				apiKey: 123,
				dryRun: 'not-a-boolean',
				project: 'not-a-boolean',
			});

			expect(result.success).toBe(false);
		});
	});
});
