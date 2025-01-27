import { vi, expect, it, describe, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import Logout from '../source/commands/logout';
import delay from 'delay';
import * as keytar from 'keytar';
import '../source/i18n.ts';

vi.mock('keytar', () => {
	const keytar = {
		setPassword: vi.fn(),
		getPassword: vi.fn(), // Mocked return value
		deletePassword: vi.fn(),
	};
	return { ...keytar, default: keytar };
});
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
