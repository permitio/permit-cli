#!/usr/bin/env -S deno run --allow-all

import React from 'react';
import { render } from 'ink';

function App() {
	const args = Deno.args;

	if (args.includes('--version')) {
		return <text>permit-cli v0.1.2</text>;
	}

	if (args.includes('--help')) {
		return (
			<text>
				{`
Permit.io CLI v0.1.2

Usage:
  permit [command] [options]

Commands:
  pdp check    Check PDP status
  --help       Show this help message
  --version    Show version
`}
			</text>
		);
	}

	if (args[0] === 'pdp' && args[1] === 'check') {
		return <text>Checking PDP status...</text>;
	}

	return (
		<text>
			{`
Permit.io CLI v0.1.2

Usage:
  permit [command] [options]

Commands:
  pdp check    Check PDP status
  --help       Show this help message
  --version    Show version
`}
		</text>
	);
}

if (import.meta.main) {
	render(<App />);
}
