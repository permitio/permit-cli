import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from 'ink-testing-library';
import Run from '../source/commands/pdp/run';

describe('PDP Run', () => {
	it('Should render the PDP Run command', () => {
		const { lastFrame } = render(<Run options={{ opa: 8181 }} />);
		expect(lastFrame()?.toString()).toMatch(/Loading Token/);
	});
});
