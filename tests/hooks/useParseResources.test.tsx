import React from 'react';
import { Text } from 'ink';
import { render } from 'ink-testing-library';
import { useParseResources } from '../../source/hooks/useParseResources';
import { describe, it, expect } from 'vitest';

// Test component that uses the hook
const TestComponent = ({ resources }: { resources?: string[] }) => {
	try {
		const parsedResources = useParseResources(resources);
		return <Text>{JSON.stringify(parsedResources, null, 2)}</Text>;
	} catch (err) {
		return <Text>Error: {(err as Error).message}</Text>;
	}
};

describe('useParseResources', () => {
	it('returns empty array when no resources provided', () => {
		const { lastFrame } = render(<TestComponent />);
		expect(lastFrame()).toBe('[]');
	});

	it('parses simple resource with only key', () => {
		const { lastFrame } = render(<TestComponent resources={['users']} />);
		const parsed = JSON.parse(lastFrame()?.replace(/\n\s*/g, '') || '[]');
		expect(parsed).toEqual([
			{
				key: 'users',
				name: 'users',
				description: undefined,
				attributes: undefined,
				actions: {},
			},
		]);
	});

	it('parses resource with name', () => {
		const { lastFrame } = render(
			<TestComponent resources={['users:User Management']} />,
		);
		const parsed = JSON.parse(lastFrame()?.replace(/\n\s*/g, '') || '[]');
		expect(parsed).toEqual([
			{
				key: 'users',
				name: 'User Management',
				description: 'User Management',
				attributes: undefined,
				actions: {},
			},
		]);
	});

	it('parses resource with attributes', () => {
		const { lastFrame } = render(
			<TestComponent resources={['users@department,role']} />,
		);
		const parsed = JSON.parse(lastFrame()?.replace(/\n\s*/g, '') || '[]');
		expect(parsed).toEqual([
			{
				key: 'users',
				name: 'users',
				description: undefined,
				attributes: {
					department: {},
					role: {},
				},
				actions: {},
			},
		]);
	});

	it('parses complete resource with name and attributes', () => {
		const { lastFrame } = render(
			<TestComponent resources={['users:User Management@department,role']} />,
		);
		const parsed = JSON.parse(lastFrame()?.replace(/\n\s*/g, '') || '[]');
		expect(parsed).toEqual([
			{
				key: 'users',
				name: 'User Management',
				description: 'User Management',
				attributes: {
					department: {},
					role: {},
				},
				actions: {},
			},
		]);
	});

	it('parses multiple resources', () => {
		const { lastFrame } = render(
			<TestComponent
				resources={[
					'users:User Management@department,role',
					'posts:Blog Posts@category,status',
					'comments@status',
				]}
			/>,
		);
		const parsed = JSON.parse(lastFrame()?.replace(/\n\s*/g, '') || '[]');
		expect(parsed).toEqual([
			{
				key: 'users',
				name: 'User Management',
				description: 'User Management',
				attributes: {
					department: {},
					role: {},
				},
				actions: {},
			},
			{
				key: 'posts',
				name: 'Blog Posts',
				description: 'Blog Posts',
				attributes: {
					category: {},
					status: {},
				},
				actions: {},
			},
			{
				key: 'comments',
				name: 'comments',
				description: undefined,
				attributes: {
					status: {},
				},
				actions: {},
			},
		]);
	});

	it('throws error for invalid resource format', () => {
		const { lastFrame } = render(<TestComponent resources={[':']} />);
		expect(lastFrame()).toContain(
			'Error: Invalid resource format. Expected ["key:name@attribute1,attribute2"], got [":"]Error: Invalid',
		);
	});

	it('handles empty strings in resource array', () => {
		const { lastFrame } = render(<TestComponent resources={['']} />);
		expect(lastFrame()).toContain('Error: Invalid resource format');
	});

	it('trims whitespace from all parts', () => {
		const { lastFrame } = render(
			<TestComponent
				resources={[' users : User Management  @ department , role ']}
			/>,
		);
		const parsed = JSON.parse(lastFrame()?.replace(/\n\s*/g, '') || '[]');
		expect(parsed).toEqual([
			{
				key: 'users',
				name: 'User Management',
				description: 'User Management',
				attributes: {
					department: {},
					role: {},
				},
				actions: {},
			},
		]);
	});

	it('ignores empty attributes', () => {
		const { lastFrame } = render(
			<TestComponent resources={['users@department,,role,']} />,
		);
		const parsed = JSON.parse(lastFrame()?.replace(/\n\s*/g, '') || '[]');
		expect(parsed).toEqual([
			{
				key: 'users',
				name: 'users',
				description: undefined,
				attributes: {
					department: {},
					role: {},
				},
				actions: {},
			},
		]);
	});
});
