import React from 'react';
import { Text } from 'ink';
import { render } from 'ink-testing-library';
import { useParseRoles } from '../../source/hooks/useParseRoles';
import { describe, it, expect } from 'vitest';

// Test component that uses the hook
const TestComponent = ({
	roles,
	actions,
}: {
	roles?: string[];
	actions?: string[];
}) => {
	try {
		const parsedRoles = useParseRoles(roles, actions);
		return <Text>{JSON.stringify(parsedRoles, null, 2)}</Text>;
	} catch (err) {
		return <Text>Error: {(err as Error).message}</Text>;
	}
};

describe('useParseRoles', () => {
	it('returns empty array when no roles provided', () => {
		const { lastFrame } = render(<TestComponent />);
		expect(lastFrame()).toBe('[]');
	});

	it('parses role with resource:action', () => {
		const { lastFrame } = render(
			<TestComponent roles={['admin:users:create|posts:read']} />,
		);
		const parsed = JSON.parse(lastFrame()?.replace(/\n\s*/g, '') || '[]');
		expect(parsed).toEqual([
			{
				key: 'admin',
				name: 'admin',
				permissions: ['users:create', 'posts:read'],
			},
		]);
	});

	it('expands resource-only permission to all actions', () => {
		const { lastFrame } = render(
			<TestComponent
				roles={['editor:posts']}
				actions={['create', 'read', 'update', 'delete']}
			/>,
		);
		const parsed = JSON.parse(lastFrame()?.replace(/\n\s*/g, '') || '[]');
		expect(parsed).toEqual([
			{
				key: 'editor',
				name: 'editor',
				permissions: [
					'posts:create',
					'posts:read',
					'posts:update',
					'posts:delete',
				],
			},
		]);
	});

	it('parses multiple roles', () => {
		const { lastFrame } = render(
			<TestComponent
				roles={[
					'admin:users:create|posts:read',
					'editor:posts',
					'user:users:read',
				]}
				actions={['create', 'read', 'update', 'delete']}
			/>,
		);
		const parsed = JSON.parse(lastFrame()?.replace(/\n\s*/g, '') || '[]');
		expect(parsed).toEqual([
			{
				key: 'admin',
				name: 'admin',
				permissions: ['users:create', 'posts:read'],
			},
			{
				key: 'editor',
				name: 'editor',
				permissions: [
					'posts:create',
					'posts:read',
					'posts:update',
					'posts:delete',
				],
			},
			{
				key: 'user',
				name: 'user',
				permissions: ['users:read'],
			},
		]);
	});

	it('throws error for invalid role key', () => {
		const { lastFrame } = render(<TestComponent roles={[':users:create']} />);
		expect(lastFrame()).toContain('Error: Invalid role format.');
	});

	it('throws error for empty string', () => {
		const { lastFrame } = render(<TestComponent roles={['']} />);
		expect(lastFrame()).toContain('Error: Invalid role format');
	});

	it('trims whitespace from all parts', () => {
		const { lastFrame } = render(
			<TestComponent roles={['admin:posts']} actions={['create', 'read']} />,
		);
		const parsed = JSON.parse(lastFrame()?.replace(/\n\s*/g, '') || '[]');
		expect(parsed).toEqual([
			{
				key: 'admin',
				name: 'admin',
				permissions: ['posts:create', 'posts:read'],
			},
		]);
	});
});
