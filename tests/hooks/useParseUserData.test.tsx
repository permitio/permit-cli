import React from 'react';
import { Text } from 'ink';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useParseUserData } from '../../source/hooks/useParseUserData.js';
import delay from 'delay';

// Test component that uses our hook and displays its values
function TestComponent({
	options,
	overrideUserId,
	onUpdateKey,
}: {
	options: any;
	overrideUserId?: string;
	onUpdateKey?: (fn: (key: string) => void) => void;
}) {
	const { payload, parseError, updatePayloadKey } = useParseUserData(
		options,
		overrideUserId,
	);

	// Expose the updateKey function to tests
	if (onUpdateKey) {
		onUpdateKey(updatePayloadKey);
	}

	return (
		<>
			<Text>key: {payload.key}</Text>
			<Text>email: {payload.email || 'undefined'}</Text>
			<Text>firstName: {payload.firstName || 'undefined'}</Text>
			<Text>lastName: {payload.lastName || 'undefined'}</Text>
			<Text>attributes: {JSON.stringify(payload.attributes)}</Text>
			<Text>roleAssignments: {JSON.stringify(payload.roleAssignments)}</Text>
			<Text>parseError: {parseError || 'null'}</Text>
		</>
	);
}

// Mock console.warn to avoid polluting test output and to verify it's called
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('useParseUserData', () => {
	beforeEach(() => {
		mockConsoleWarn.mockClear();
	});

	describe('Basic functionality', () => {
		it('should return empty payload for empty options', async () => {
			const { lastFrame } = render(<TestComponent options={{}} />);

			expect(lastFrame()).toContain('key:');
			expect(lastFrame()).toContain('email: undefined');
			expect(lastFrame()).toContain('firstName: undefined');
			expect(lastFrame()).toContain('lastName: undefined');
			expect(lastFrame()).toContain('attributes: {}');
			expect(lastFrame()).toContain('roleAssignments: []');
			expect(lastFrame()).toContain('parseError: null');
		});

		it('should use overrideUserId when provided', async () => {
			const { lastFrame } = render(
				<TestComponent
					options={{ key: 'original-key' }}
					overrideUserId="override-key"
				/>,
			);

			expect(lastFrame()).toContain('key: override-key');
		});

		it('should use options.key when overrideUserId is not provided', async () => {
			const { lastFrame } = render(
				<TestComponent options={{ key: 'original-key' }} />,
			);

			expect(lastFrame()).toContain('key: original-key');
		});

		it('should update key when updatePayloadKey is called', async () => {
			let updateFn: ((key: string) => void) | undefined;

			const { lastFrame, rerender } = render(
				<TestComponent
					options={{ key: 'original-key' }}
					onUpdateKey={fn => {
						updateFn = fn;
					}}
				/>,
			);

			// Initial render should show original key
			expect(lastFrame()).toContain('key: original-key');

			// Update the key
			if (updateFn) {
				updateFn('new-key');
			}

			// Force rerender to see changes
			rerender(
				<TestComponent
					options={{ key: 'original-key' }}
					onUpdateKey={fn => {
						updateFn = fn;
					}}
				/>,
			);

			// Should show updated key
			expect(lastFrame()).toContain('key: new-key');
		});
	});

	describe('User profile fields', () => {
		it('should include firstName in payload', async () => {
			const { lastFrame } = render(
				<TestComponent options={{ key: 'test-key', firstName: 'John' }} />,
			);

			expect(lastFrame()).toContain('firstName: John');
		});

		it('should include lastName in payload', async () => {
			const { lastFrame } = render(
				<TestComponent options={{ key: 'test-key', lastName: 'Doe' }} />,
			);

			expect(lastFrame()).toContain('lastName: Doe');
		});

		it('should include email in payload', async () => {
			const { lastFrame } = render(
				<TestComponent
					options={{ key: 'test-key', email: 'john@example.com' }}
				/>,
			);

			expect(lastFrame()).toContain('email: john@example.com');
		});

		it('should include all profile fields when provided', async () => {
			const { lastFrame } = render(
				<TestComponent
					options={{
						key: 'test-key',
						firstName: 'John',
						lastName: 'Doe',
						email: 'john@example.com',
					}}
				/>,
			);

			expect(lastFrame()).toContain('firstName: John');
			expect(lastFrame()).toContain('lastName: Doe');
			expect(lastFrame()).toContain('email: john@example.com');
		});
	});

	describe('Attribute parsing', () => {
		it('should parse attributes correctly', async () => {
			const { lastFrame } = render(
				<TestComponent
					options={{
						key: 'test-key',
						attributes: ['department:engineering', 'level:senior'],
					}}
				/>,
			);

			expect(lastFrame()).toContain('"department":"engineering"');
			expect(lastFrame()).toContain('"level":"senior"');
		});

		it('should handle empty attributes gracefully', async () => {
			const { lastFrame } = render(
				<TestComponent
					options={{
						key: 'test-key',
						attributes: [],
					}}
				/>,
			);

			expect(lastFrame()).toContain('attributes: {}');
		});

		it('should ignore malformed attributes', async () => {
			const { lastFrame } = render(
				<TestComponent
					options={{
						key: 'test-key',
						attributes: ['department:engineering', 'badformat'],
					}}
				/>,
			);

			expect(lastFrame()).toContain('"department":"engineering"');
			expect(lastFrame()).not.toContain('badformat');
		});
	});

	describe('Role parsing', () => {
		it('should parse simple role format (role)', async () => {
			const { lastFrame } = render(
				<TestComponent
					options={{
						key: 'test-key',
						roles: ['admin'],
					}}
				/>,
			);

			expect(lastFrame()).toContain('"role":"admin"');
			expect(lastFrame()).toContain('"tenant":"default"');
		});

		it('should parse tenant/role format', async () => {
			const { lastFrame } = render(
				<TestComponent
					options={{
						key: 'test-key',
						roles: ['tenant1/editor'],
					}}
				/>,
			);

			expect(lastFrame()).toContain('"tenant":"tenant1"');
			expect(lastFrame()).toContain('"role":"editor"');
		});

		it('should parse resourceInstance#role format', async () => {
			const { lastFrame } = render(
				<TestComponent
					options={{
						key: 'test-key',
						roles: ['project:123#viewer'],
					}}
				/>,
			);

			expect(lastFrame()).toContain('"resourceInstance":"project:123"');
			expect(lastFrame()).toContain('"role":"viewer"');
		});

		it('should parse tenant/resourceInstance#role format', async () => {
			const { lastFrame } = render(
				<TestComponent
					options={{
						key: 'test-key',
						roles: ['tenant1/project:123#owner'],
					}}
				/>,
			);

			expect(lastFrame()).toContain('"tenant":"tenant1"');
			expect(lastFrame()).toContain('"resourceInstance":"project:123"');
			expect(lastFrame()).toContain('"role":"owner"');
		});

		it('should skip empty role strings', async () => {
			const { lastFrame } = render(
				<TestComponent
					options={{
						key: 'test-key',
						roles: ['admin', '', '  '],
					}}
				/>,
			);

			// Should only contain the admin role
			expect(lastFrame()).toContain('"role":"admin"');
			expect(lastFrame()).toContain(
				'roleAssignments: [{"role":"admin","tenant":"default"}]',
			);
		});

		it('should log a warning for invalid role format', async () => {
			render(
				<TestComponent
					options={{
						key: 'test-key',
						roles: ['invalid@format'],
					}}
				/>,
			);

			// Wait a moment for the console.warn to be called
			await delay(10);

			expect(mockConsoleWarn).toHaveBeenCalledWith(
				expect.stringContaining('Invalid role format'),
			);
		});

		it('should handle multiple role formats together', async () => {
			const { lastFrame } = render(
				<TestComponent
					options={{
						key: 'test-key',
						roles: [
							'admin',
							'tenant1/editor',
							'project:123#viewer',
							'tenant2/resource:xyz#owner',
						],
					}}
				/>,
			);

			// Check all role assignments are present
			expect(lastFrame()).toContain(
				'roleAssignments:\n[{"role":"admin","tenant":"default"},{"tenant":"tenant1","role":"editor"},{"resourceInstance":"proje\nct:123","role":"viewer"},{"tenant":"tenant2","resourceInstance":"resource:xyz","role":"owner"}]',
			);
		});
	});
});
