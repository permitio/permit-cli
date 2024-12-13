import React from 'react';
import { render } from 'ink-testing-library';
import { describe, vi, it, expect, afterEach } from 'vitest';
import delay from 'delay';
import Check from '../source/commands/pdp/check';

global.fetch = vi.fn();

describe('PDP Check Component', () => {
	afterEach(() => {
		// Clear mock calls after each test
		vi.clearAllMocks();
	});
	it('should render with the given options', async () => {
		(fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ allow: true }),
		});
		const options = {
			user: 'testUser',
			resource: 'testResource',
			action: 'testAction',
			tenant: 'testTenant',
			keyAccount: 'testKeyAccount',
		};

		const { lastFrame } = render(<Check options={options} />);
		expect(lastFrame()).toContain(`Checking user="testUser"action=testAction resource=testResourceat tenant=testTenant`);
		await delay(50);
		expect(lastFrame()?.toString()).toContain('ALLOWED');
	});
	it('should render with the given options', async () => {
		(fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ allow: false }),
		});
		const options = {
			user: 'testUser',
			resource: 'testResource',
			action: 'testAction',
			tenant: 'testTenant',
			keyAccount: 'testKeyAccount',
		};

		const { lastFrame } = render(<Check options={options} />);
		expect(lastFrame()).toContain(`Checking user="testUser"action=testAction resource=testResourceat tenant=testTenant`);
		await delay(50);
		expect(lastFrame()?.toString()).toContain('DENIED');
	});
	it('should render with the given options', async () => {
		(fetch as any).mockResolvedValueOnce({
			ok: false,
			text: async () => 'Error',
		});
		const options = {
			user: 'testUser',
			resource: 'testResource',
			action: 'testAction',
			tenant: 'testTenant',
			keyAccount: 'testKeyAccount',
		};

		const { lastFrame } = render(<Check options={options} />);
		expect(lastFrame()).toContain(`Checking user="testUser"action=testAction resource=testResourceat tenant=testTenant`);
		await delay(50);
		expect(lastFrame()?.toString()).toContain('Error');
	});
	it('should render with the given options with multiple resource', async () => {
		(fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ allow: true }),
		});
		const options = {
			user: 'testUser',
			resource: 'testResourceType: testRecsourceKey',
			action: 'testAction',
			tenant: 'testTenant',
			keyAccount: 'testKeyAccount',
		};

		const { lastFrame } = render(<Check options={options} />);
		expect(lastFrame()).toContain(`Checking user="testUser"action=testAction resource=testResourceType: testRecsourceKeyat
tenant=testTenant`);
		await delay(50);
		expect(lastFrame()?.toString()).toContain('ALLOWED');
	});
});
