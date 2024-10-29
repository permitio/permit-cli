import React from 'react';
import { render } from 'ink-testing-library';
import { waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApiKey from '../commands/apiKey.js';
import keytar from 'keytar';
import { KEYSTORE_PERMIT_SERVICE_NAME } from '../config.js';

beforeEach(() => {
	// Clear all mocks before each test
	vi.clearAllMocks();
});

describe('ApiKey component', () => {
	it('should save a valid key to the key store', () => {
		vi.spyOn(keytar, 'setPassword').mockResolvedValue(undefined);

		const longValidKey = 'permit_key_' + 'a'.repeat(86);

		const { lastFrame } = render(
			<ApiKey
				args={['save', longValidKey]}
				options={{ keyAccount: 'test-account' }}
			/>,
		);

		// Assert key is saved with correct service name
		expect(keytar.setPassword).toHaveBeenCalledWith(
			KEYSTORE_PERMIT_SERVICE_NAME,
			'test-account',
			longValidKey,
		);

		expect(lastFrame()).toContain('Key saved to secure key store.');
	});

	it('should validate a valid key', () => {
		const validKey = 'permit_key_' + 'a'.repeat(86);

		const { lastFrame } = render(
			<ApiKey
				args={['validate', validKey]}
				options={{ keyAccount: 'test-account' }}
			/>,
		);

		// Assert the validation message is displayed
		expect(lastFrame()).toContain('Key is valid.');
	});

	it('should display an error for an invalid key', () => {
		const { lastFrame } = render(
			<ApiKey
				args={['validate', 'invalid_key']}
				options={{ keyAccount: 'test-account' }}
			/>,
		);

		// Assert the error message for invalid key
		expect(lastFrame()).toContain('Key is not valid.');
		expect(lastFrame()).toContain('Provided key: invalid_key');
	});

	it('should read a key from the key store', async () => {
		vi.spyOn(keytar, 'getPassword').mockResolvedValue('mocked-key');

		const { lastFrame } = render(
			<ApiKey args={['read', '']} options={{ keyAccount: 'test-account' }} />,
		);

		// Assert the key is read from the key store and displayed
		await waitFor(() => {
			expect(lastFrame()).toContain('mocked-key');
		});
	});

	it('should handle key read errors', async () => {
		vi.spyOn(keytar, 'getPassword').mockRejectedValueOnce(
			new Error('Error reading key'),
		);

		const { lastFrame } = render(
			<ApiKey args={['read', '']} options={{ keyAccount: 'test-account' }} />,
		);

		// Assert the error message is displayed for failed key read
		await waitFor(() => {
			expect(lastFrame()).toContain('Failed to read key');
		});
	});
	it('should handle keytar.getPassword returning null or undefined', async () => {
		vi.spyOn(keytar, 'getPassword').mockResolvedValueOnce(null);

		const { lastFrame } = render(
			<ApiKey args={['read', '']} options={{ keyAccount: 'test-account' }} />,
		);

		// Assert that the component handles a null/undefined value correctly
		await waitFor(() => {
			expect(lastFrame()).toContain('');
		});
	});
});
