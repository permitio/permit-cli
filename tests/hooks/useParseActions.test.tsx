import React from 'react';
import { Text } from 'ink';
import { render } from 'ink-testing-library';
import { useParseActions } from '../../source/hooks/useParseActions';
import { describe, it, expect } from 'vitest';

const TestComponent = ({ actions }: { actions?: string[] }) => {
	try {
		const parsedActions = useParseActions(actions);
		return <Text>{JSON.stringify(parsedActions, null, 2)}</Text>;
	} catch (err) {
		return <Text>Error: {(err as Error).message}</Text>;
	}
};

describe('useParseActions', () => {
	it('returns empty object when no actions provided', () => {
		const { lastFrame } = render(<TestComponent />);
		expect(lastFrame()).toBe('{}');
	});

	it('parses simple action with only key', () => {
		const { lastFrame } = render(<TestComponent actions={['read']} />);
		const parsed = JSON.parse(lastFrame()?.replace(/\n\s*/g, '') || '{}');
		expect(parsed).toEqual({
			read: {
				name: 'read',
				description: undefined,
				attributes: undefined,
			},
		});
	});

	it('parses action with description', () => {
		const { lastFrame } = render(
			<TestComponent actions={['read:Read Access']} />,
		);
		const parsed = JSON.parse(lastFrame()?.replace(/\n\s*/g, '') || '{}');
		expect(parsed).toEqual({
			read: {
				name: 'read',
				description: 'Read Access',
				attributes: undefined,
			},
		});
	});

	it('parses action with attributes', () => {
		const { lastFrame } = render(
			<TestComponent actions={['read@owner,department']} />,
		);
		const parsed = JSON.parse(lastFrame()?.replace(/\n\s*/g, '') || '{}');
		expect(parsed).toEqual({
			read: {
				name: 'read',
				description: undefined,
				attributes: {
					owner: {},
					department: {},
				},
			},
		});
	});

	it('parses complete action with description and attributes', () => {
		const { lastFrame } = render(
			<TestComponent actions={['read:Read Access@owner,department']} />,
		);
		const parsed = JSON.parse(lastFrame()?.replace(/\n\s*/g, '') || '{}');
		expect(parsed).toEqual({
			read: {
				name: 'read',
				description: 'Read Access',
				attributes: {
					owner: {},
					department: {},
				},
			},
		});
	});

	it('parses multiple actions', () => {
		const { lastFrame } = render(
			<TestComponent
				actions={[
					'read:Read Access@owner,department',
					'write:Write Access@owner',
					'delete@owner',
				]}
			/>,
		);
		const parsed = JSON.parse(lastFrame()?.replace(/\n\s*/g, '') || '{}');
		expect(parsed).toEqual({
			read: {
				name: 'read',
				description: 'Read Access',
				attributes: {
					owner: {},
					department: {},
				},
			},
			write: {
				name: 'write',
				description: 'Write Access',
				attributes: {
					owner: {},
				},
			},
			delete: {
				name: 'delete',
				description: undefined,
				attributes: {
					owner: {},
				},
			},
		});
	});

	it('throws error for invalid action format', () => {
		const { lastFrame } = render(<TestComponent actions={[':']} />);
		expect(lastFrame()).toContain(
			'Invalid action format. Expected ["key:description@attribute1,attribute2"]',
		);
	});

	it('handles empty strings in action array', () => {
		const { lastFrame } = render(<TestComponent actions={['']} />);
		expect(lastFrame()).toContain('Error: Invalid action format');
	});

	it('trims whitespace from all parts', () => {
		const { lastFrame } = render(
			<TestComponent
				actions={[' read : Read Access  @ owner , department ']}
			/>,
		);
		const parsed = JSON.parse(lastFrame()?.replace(/\n\s*/g, '') || '{}');
		expect(parsed).toEqual({
			read: {
				name: 'read',
				description: 'Read Access',
				attributes: {
					owner: {},
					department: {},
				},
			},
		});
	});

	it('ignores empty attributes', () => {
		const { lastFrame } = render(
			<TestComponent actions={['read@owner,,department,']} />,
		);
		const parsed = JSON.parse(lastFrame()?.replace(/\n\s*/g, '') || '{}');
		expect(parsed).toEqual({
			read: {
				name: 'read',
				description: undefined,
				attributes: {
					owner: {},
					department: {},
				},
			},
		});
	});

	it('merges duplicate action keys', () => {
		const { lastFrame } = render(
			<TestComponent
				actions={[
					'read:First Definition@attr1',
					'read:Second Definition@attr2',
				]}
			/>,
		);
		const parsed = JSON.parse(lastFrame()?.replace(/\n\s*/g, '') || '{}');
		expect(parsed).toEqual({
			read: {
				name: 'read',
				description: 'Second Definition',
				attributes: {
					attr2: {},
				},
			},
		});
	});
});
