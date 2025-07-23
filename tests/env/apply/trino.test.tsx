import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { describe, it, expect, vi } from 'vitest';
import Trino from '../../../source/commands/env/apply/trino.js';

vi.mock('../../../source/components/AuthProvider.js', () => {
	return {
		__esModule: true,
		AuthProvider: function AuthProvider({
			children,
		}: {
			children: React.ReactNode;
		}) {
			return <>{children}</>;
		},
	};
});

vi.mock('../../../source/components/env/trino/TrinoComponent.js', () => ({
	__esModule: true,
	default: ({ url, user }: { url: string; user: string }) => (
		<Text>
			TrinoComponentMock url={url} user={user}
		</Text>
	),
}));

describe('permit env apply trino CLI command', () => {
	it('renders the TrinoComponent and passes props', async () => {
		const { lastFrame } = render(
			<Trino
				options={{
					url: 'http://localhost:8080',
					user: 'testuser',
				}}
			/>,
		);
		expect(lastFrame()).toContain('TrinoComponentMock');
		expect(lastFrame()).toContain('testuser');
	});
});
