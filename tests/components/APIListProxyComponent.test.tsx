import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import APIListProxyTableComponent from '../../source/components/api/proxy/APIListProxyComponent.js';

// ---------- Mocks ----------

// Dynamic mock variables to control hook behavior
let mockStatus;
let mockError;
let mockProxies;
let mockTotalCount;
let mockListProxies;

// Mock AuthProvider
vi.mock('../../source/components/AuthProvider.js', () => ({
	useAuth: () => ({
		scope: { project_id: 'proj1', environment_id: 'env1' },
	}),
}));

// Mock useListProxy hook
vi.mock('../../source/hooks/useListProxy.js', () => ({
	useListProxy: () => ({
		status: mockStatus,
		errorMessage: mockError,
		proxies: mockProxies,
		totalCount: mockTotalCount,
		listProxies: mockListProxies,
	}),
}));

// Mock Table component to inspect props
vi.mock('../../source/components/ui/Table.js', () => ({
	default: ({ data, headers }) => (
		<Text>MockTable: {JSON.stringify({ data, headers })}</Text>
	),
}));

// ---------- Helpers ----------

const createOptions = (partial = {}) => ({
	apiKey: undefined,
	projectId: undefined,
	envId: undefined,
	expandKey: false,
	page: 1,
	perPage: 30,
	...partial,
});

// ---------- Tests ----------

describe('APIListProxyTableComponent', () => {
	beforeEach(() => {
		mockStatus = 'processing';
		mockError = null;
		mockProxies = [];
		mockTotalCount = 0;
		mockListProxies = vi.fn();
	});

	it('shows loading spinner when processing', () => {
		const { lastFrame } = render(
			<APIListProxyTableComponent options={createOptions()} />,
		);
		expect(lastFrame()).toContain('Loading proxy configs');
	});

	it('shows error message on error', () => {
		mockStatus = 'error';
		mockError = 'Failed to load';

		const { lastFrame } = render(
			<APIListProxyTableComponent options={createOptions()} />,
		);
		expect(lastFrame()).toContain('Error: Failed to load');
	});

	it('shows no data message when no proxies', () => {
		mockStatus = 'done';
		mockTotalCount = 5;

		const { lastFrame } = render(
			<APIListProxyTableComponent options={createOptions()} />,
		);

		expect(lastFrame()).toContain('Proxy Configs:');
		expect(lastFrame()).toContain('Showing 0 items | Page 1 | Total Pages: 5');
		expect(lastFrame()).toContain('No proxy configs found.');
	});

	it('renders table with truncated and formatted data', () => {
		mockStatus = 'done';
		mockTotalCount = 1;
		mockProxies = [
			{
				key: 'abcdefghijkl',
				secret: 'sec1',
				name: 'name1',
				auth_mechanism: 'Bearer',
				mapping_rules: [{ url: 'http://a' }, { url: 'http://b' }],
			},
		];

		const { lastFrame } = render(
			<APIListProxyTableComponent options={createOptions()} />,
		);

		const expectedKey = 'abcdefg...';

		expect(lastFrame()).toContain('Proxy Configs:');
		expect(lastFrame()).toContain('Showing 1 items | Page 1 | Total Pages: 1');
		expect(lastFrame()).toContain(
			`MockTable: ${JSON.stringify({
				data: [
					{
						'#': 1,
						key: expectedKey,
						secret: 'sec1',
						name: 'name1',
						auth_mechanism: 'Bearer',
						mapping_rules: 'http://a, http://b',
					},
				],
				headers: [
					'#',
					'key',
					'secret',
					'name',
					'auth_mechanism',
					'mapping_rules',
				],
			})}`,
		);
	});

	it('renders full key when expandKey=true', () => {
		mockStatus = 'done';
		mockTotalCount = 1;
		mockProxies = [
			{
				key: 'longkeyvalue',
				secret: '',
				name: '',
				auth_mechanism: '',
				mapping_rules: [],
			},
		];

		const { lastFrame } = render(
			<APIListProxyTableComponent
				options={createOptions({ expandKey: true })}
			/>,
		);

		expect(lastFrame()).toContain(
			`MockTable: ${JSON.stringify({
				data: [
					{
						'#': 1,
						key: 'longkeyvalue',
						secret: '',
						name: '',
						auth_mechanism: '',
						mapping_rules: '',
					},
				],
				headers: [
					'#',
					'key',
					'secret',
					'name',
					'auth_mechanism',
					'mapping_rules',
				],
			})}`,
		);
	});

	it('calls listProxies on mount', () => {
		render(<APIListProxyTableComponent options={createOptions()} />);
		expect(mockListProxies).toHaveBeenCalled();
	});
});
