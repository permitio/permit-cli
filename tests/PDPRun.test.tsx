import React from 'react';
import {vi, describe, expect, it } from 'vitest';
import { render } from 'ink-testing-library';
import Run from '../source/commands/pdp/run';
import * as keytar from "keytar"

vi.mock("keytar",()=>({
	getPassword: vi.fn(),
	setPassword: vi.fn(),
	deletePassword:vi.fn()
}))

describe('PDP Run', () => {
	it('Should render the PDP Run command', () => {
		const {getPassword} = keytar;
		(getPassword as any).mockResolvedValueOnce("permit_key_".concat("a".repeat(97)))
		const { lastFrame } = render(<Run options={{ opa: 8181 }} />);
		expect(lastFrame()?.toString()).toMatch(/Loading Token/);
	});
});
