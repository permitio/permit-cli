import React from 'react';
import { render } from 'ink-testing-library';
import { describe, vi, expect, it } from 'vitest';
import Graph from '../source/commands/graph';
import delay from 'delay';
import * as keytar from 'keytar';

vi.mock('keytar', () => {
	const demoPermitKey = 'permit_key_'.concat('a'.repeat(97));

	const keytarMock = {
		setPassword: vi.fn().mockResolvedValue(() => demoPermitKey),
		getPassword: vi.fn().mockResolvedValue(() => demoPermitKey),
		deletePassword: vi.fn().mockResolvedValue(demoPermitKey),
	};

	return { ...keytarMock, default: keytarMock };
});

describe('graph command', () => {
	it('should render the Graph component inside AuthProvider', async () => {
		const options = { apiKey: 'test-api-key' };
		const { lastFrame } = render(<Graph options={options} />);

		await delay(100); // Ensures async rendering completes before assertions
		expect(lastFrame()).not.toBeNull();
	});
});
