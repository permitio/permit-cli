import React from 'react';
import { test } from 'node:test';
import { render } from 'ink-testing-library';
import assert from 'node:assert';
import Check from './source/commands/pdp/check.js';
import { env } from 'process';

const API_KEY = env.API_KEY;

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
