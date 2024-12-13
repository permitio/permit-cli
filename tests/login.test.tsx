import React from 'react';
import { vi, expect, it, describe } from 'vitest';
import { render } from 'ink-testing-library';
import Login from '../source/commands/login';
import delay from 'delay';
describe('Login Component', () => {
	it('Should render the login component', async () => {
		const { lastFrame } = render(
			<Login options={{ key: 'permit_key_'.concat('a'.repeat(96)) }} />,
		);
		expect(lastFrame()?.toString()).toMatch('Logging in');
	});
});
