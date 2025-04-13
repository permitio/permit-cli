import React from 'react';
import { Text } from 'ink';
import { render } from 'ink-testing-library';
import { useParseRoles } from '../../source/hooks/useParseRoles';
import { describe, it, expect } from 'vitest';

// Test component that uses the hook
const TestComponent = ({ roles }: { roles?: string[] }) => {
	try {
		const parsedRoles = useParseRoles(roles);
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

	it('parses simple role with only key', () => {
		const { lastFrame } = render(<TestComponent roles={['admin']} />);
		const parsed = JSON.parse(lastFrame()?.replace(/\n\s*/g, '') || '[]');
		expect(parsed).toEqual([
			{
				key: 'admin',
				name: 'admin',
				description: undefined,
				permissions: undefined,
			},
		]);
	});

	it('parses role with description', () => {
		const { lastFrame } = render(
			<TestComponent roles={['admin:System Administrator']} />,
		);
		const parsed = JSON.parse(lastFrame()?.replace(/\n\s*/g, '') || '[]');
		expect(parsed).toEqual([
			{
				key: 'admin',
				name: 'admin',
				description: 'System Administrator',
				permissions: undefined,
			},
		]);
	});

	it('parses role with permissions', () => {
		const { lastFrame } = render(
			<TestComponent roles={['admin@users:read|posts:write']} />,
		);
		const parsed = JSON.parse(lastFrame()?.replace(/\n\s*/g, '') || '[]');
		expect(parsed).toEqual([
			{
				key: 'admin',
				name: 'admin',
				description: undefined,
				permissions: ['users:read', 'posts:write'],
			},
		]);
	});

	it('parses complete role with description and permissions', () => {
		const { lastFrame } = render(
			<TestComponent
				roles={['admin:System Administrator@users:read|posts:write']}
			/>,
		);
		const parsed = JSON.parse(lastFrame()?.replace(/\n\s*/g, '') || '[]');
		expect(parsed).toEqual([
			{
				key: 'admin',
				name: 'admin',
				description: 'System Administrator',
				permissions: ['users:read', 'posts:write'],
			},
		]);
	});

	it('parses multiple roles', () => {
		const { lastFrame } = render(
			<TestComponent
				roles={[
					'admin:Administrator@*:*',
					'editor:Content Editor@posts:write|posts:read',
					'viewer@posts:read',
				]}
			/>,
		);
		const parsed = JSON.parse(lastFrame()?.replace(/\n\s*/g, '') || '[]');
		expect(parsed).toEqual([
			{
				key: 'admin',
				name: 'admin',
				description: 'Administrator',
				permissions: ['*:*'],
			},
			{
				key: 'editor',
				name: 'editor',
				description: 'Content Editor',
				permissions: ['posts:write', 'posts:read'],
			},
			{
				key: 'viewer',
				name: 'viewer',
				description: undefined,
				permissions: ['posts:read'],
			},
		]);
	});

	it('throws error for invalid role format', () => {
		const { lastFrame } = render(<TestComponent roles={[':']} />);
		expect(lastFrame()).toContain('Error: Invalid role key');
	});

	it('handles empty strings in role array', () => {
		const { lastFrame } = render(<TestComponent roles={['']} />);
		expect(lastFrame()).toContain('Error: Invalid role format');
	});

	it('trims whitespace from all parts', () => {
		const { lastFrame } = render(
			<TestComponent
				roles={[' admin : Administrator  @ users:read | posts:write ']}
			/>,
		);
		const parsed = JSON.parse(lastFrame()?.replace(/\n\s*/g, '') || '[]');
		expect(parsed).toEqual([
			{
				key: 'admin',
				name: 'admin',
				description: 'Administrator',
				permissions: ['users:read', 'posts:write'],
			},
		]);
	});
});
