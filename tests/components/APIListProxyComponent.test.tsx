import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import APIListProxyTableComponent from '../../source/components/api/proxy/APIListProxyComponent.js';

// ---------- Mocks ----------

let mockStatus;
let mockError;
let mockProxies;
let mockTotalCount;
let mockListProxies;

vi.mock('../../source/components/AuthProvider', () => ({
	useAuth: () => ({
		scope: { project_id: 'proj1', environment_id: 'env1' },
	}),
}));

vi.mock('../../source/hooks/useListProxy.js', () => ({
	useListProxy: () => ({
		status: mockStatus,
		errorMessage: mockError,
		proxies: mockProxies,
		totalCount: mockTotalCount,
		listProxies: mockListProxies,
	}),
}));

vi.mock('../../source/components/ui/Table.js', () => ({
	default: ({ data, headers }) => (
		<Text>
			MockTable:
			{headers.join(',')}
			{data.map((row, i) => (
				<Text key={i}>
					Row {i + 1}:{Object.values(row).join(',')}
				</Text>
			))}
		</Text>
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

		const output = lastFrame();
		expect(output).toContain('Proxy Configs:');
		expect(output).toContain('Showing 0 items');
		expect(output).toContain('No proxy configs found.');
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

		const output = lastFrame();
		expect(output).toContain('Proxy Configs:');
		expect(output).toContain('Showing 1 items');
		expect(output).toContain('abcdefg...'); // truncated key
		expect(output).toContain('sec1');
		expect(output).toContain('name1');
		expect(output).toContain('Bearer');
		expect(output).toContain('http://a');
		expect(output).toContain('http://b');
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

		const output = lastFrame();
		expect(output).toContain('longkeyvalue'); // full key shown
		expect(output).toContain('Row 1'); // confirms one row rendered
	});
});
