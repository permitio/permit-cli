import { vi, expect, it, describe, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import Logout from '../source/commands/logout';
import delay from 'delay';
import * as keytar from 'keytar';

vi.mock('keytar.default', () => ({
	setPassword: vi.fn(),
	getPassword: vi.fn(),
	deletePassword: vi.fn(),
}));

describe('Logout', () => {
	beforeEach(() => {
		vi.spyOn(process, 'exit').mockImplementation(code => {
			console.warn(`Mocked process.exit(${code})`);
		});
	});

	it('should render the logout component and call process.exit', async () => {
		const { lastFrame } = render(<Logout />);
		// Ensure initial loading text is displayed
		expect(lastFrame()).toMatch(/Cleaning session.../);
		await delay(50);
		// Ensure process.exit was called with 0
		expect(process.exit).toHaveBeenCalledWith(0);
	});
});
