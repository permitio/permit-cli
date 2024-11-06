import React from 'react';
import chalk from 'chalk';
import { test } from 'node:test';
import { render } from 'ink-testing-library';
import assert from 'node:assert';
import Check from './src/cmd/pdp/check.tsx';

const API_KEY = process.env.API_KEY;

test('check', t => {
	t.test('Should Display Checking indicator', () => {
		const { lastFrame } = render(
			<Check
				options={{
					user: 'filip@permit.io',
					action: 'create',
					resource: 'task',
					apiKey: API_KEY,
					// optional
					tenant: 'default',
					keyAccount: '',
				}}
			/>,
		);
		const res = lastFrame();
		assert.equal(
			res,
			'Checking user="filip@permit.io" action=create resource=task at tenant=default\n⠋',
		);
	});
});
