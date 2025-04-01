#!/usr/bin/env -S deno run
import React from 'react';
import { render } from 'ink';
import { Box, Text } from 'ink';

function App() {
	return (
		<Box>
			<Text>Welcome to Permit CLI!</Text>
		</Box>
	);
}

render(<App />);
