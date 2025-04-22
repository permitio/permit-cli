import React from 'react';
import { describe, it, vi, expect } from 'vitest';
import { render } from 'ink-testing-library';
import ImplementComponent from '../../../source/components/init/ImplementComponent.js';
import { type Mock } from 'vitest';
import { useAuth } from '../../../source/components/AuthProvider.js';

const arrowUp = '\u001B[A';
const arrowDown = '\u001B[B';
const enter = '\r';

// Mock useAuth hook
vi.mock('../../../source/components/AuthProvider.js', () => ({
	useAuth: vi.fn(() => ({
		authToken: 'mockedAuthToken',
	})),
}));

describe('ImplementComponent', () => {
	it('should render the component', () => {
		const { lastFrame } = render(
			<ImplementComponent
				action="mockAction"
				resource="mockResource"
				onComplete={() => {}}
				onError={() => {}}
			/>,
		);
		expect(lastFrame()).toMatch(/Implementation Example/);
	});

	it("should call node function when language is 'node'", async () => {
		const { lastFrame, stdin } = render(
			<ImplementComponent
				action="mockAction"
				resource="mockResource"
				onComplete={() => {}}
				onError={() => {}}
			/>,
		);
		await new Promise(resolve => setTimeout(resolve, 100));
		stdin.write(arrowDown);
		stdin.write(enter);
		await new Promise(resolve => setTimeout(resolve, 100));
		expect(lastFrame()).toMatch(/example.js/);
	});
	it("should call python function when language is 'python'", async () => {
		const { lastFrame, stdin } = render(
			<ImplementComponent
				action="mockAction"
				resource="mockResource"
				onComplete={() => {}}
				onError={() => {}}
			/>,
		);
		await new Promise(resolve => setTimeout(resolve, 100));
		stdin.write(arrowDown);
		stdin.write(arrowDown);
		stdin.write(enter);
		await new Promise(resolve => setTimeout(resolve, 100));
		expect(lastFrame()).toMatch(/example.py/);
	});
	it("should call java function when language is 'java'", async () => {
		const { lastFrame, stdin } = render(
			<ImplementComponent
				action="mockAction"
				resource="mockResource"
				onComplete={() => {}}
				onError={() => {}}
			/>,
		);
		await new Promise(resolve => setTimeout(resolve, 100));

		stdin.write(arrowDown);

		await new Promise(resolve => setTimeout(resolve, 50));
		stdin.write(arrowDown);
		await new Promise(resolve => setTimeout(resolve, 50));
		stdin.write(enter);
		await new Promise(resolve => setTimeout(resolve, 100));
		expect(lastFrame()).toMatch(/Example.java/);
	});
	it("should call go function when language is 'go'", async () => {
		const { lastFrame, stdin } = render(
			<ImplementComponent
				action="mockAction"
				resource="mockResource"
				onComplete={() => {}}
				onError={() => {}}
			/>,
		);
		await new Promise(resolve => setTimeout(resolve, 50));
		stdin.write(arrowDown);
		await new Promise(resolve => setTimeout(resolve, 50));

		stdin.write(arrowDown);
		await new Promise(resolve => setTimeout(resolve, 50));

		stdin.write(arrowDown);
		await new Promise(resolve => setTimeout(resolve, 50));

		stdin.write(enter);
		await new Promise(resolve => setTimeout(resolve, 100));
		expect(lastFrame()).toMatch(/example.go/);
	});

	it("should call ruby function when language is 'ruby'", async () => {
		const { lastFrame, stdin } = render(
			<ImplementComponent
				action="mockAction"
				resource="mockResource"
				onComplete={() => {}}
				onError={() => {}}
			/>,
		);
		await new Promise(resolve => setTimeout(resolve, 50));
		stdin.write(arrowDown);
		await new Promise(resolve => setTimeout(resolve, 50));

		stdin.write(arrowDown);
		await new Promise(resolve => setTimeout(resolve, 50));

		stdin.write(arrowDown);
		await new Promise(resolve => setTimeout(resolve, 50));
		stdin.write(arrowDown);
		await new Promise(resolve => setTimeout(resolve, 50));

		stdin.write(enter);
		await new Promise(resolve => setTimeout(resolve, 100));
		expect(lastFrame()).toMatch(/example.rb/);
	});

	it("should call dotnet function when language is 'dotnet'", async () => {
		const { lastFrame, stdin } = render(
			<ImplementComponent
				action="mockAction"
				resource="mockResource"
				onComplete={() => {}}
				onError={() => {}}
			/>,
		);
		await new Promise(resolve => setTimeout(resolve, 50));
		stdin.write(arrowDown);
		await new Promise(resolve => setTimeout(resolve, 50));

		stdin.write(arrowDown);
		await new Promise(resolve => setTimeout(resolve, 50));

		stdin.write(arrowDown);
		await new Promise(resolve => setTimeout(resolve, 50));
		stdin.write(arrowDown);
		await new Promise(resolve => setTimeout(resolve, 50));
		stdin.write(arrowDown);
		await new Promise(resolve => setTimeout(resolve, 50));

		stdin.write(enter);
		await new Promise(resolve => setTimeout(resolve, 100));
		expect(lastFrame()).toMatch(/Example.cs/);
	});
});
