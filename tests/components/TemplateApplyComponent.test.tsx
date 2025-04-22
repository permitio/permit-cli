import React from 'react';
import {
	getFiles,
	ApplyTemplate,
	ApplyTemplateLocally,
} from '../../source/lib/env/template/utils';
import { useAuth } from '../../source/components/AuthProvider';
import { describe, expect, it, vi } from 'vitest';
import ApplyComponent from '../../source/components/env/template/ApplyComponent';
import { render } from 'ink-testing-library';
import delay from 'delay';

vi.mock('../../source/components/AuthProvider', () => ({
	useAuth: vi.fn(() => ({
		authToken: 'permit_key'.concat('a'.repeat(97)),
	})),
}));
vi.mock('../../source/lib/env/template/utils', () => ({
	getFiles: vi.fn(() => ['template1', 'template2']),
	ApplyTemplate: vi.fn(async (filename: string, apiKey: string) => {
		if (filename == 'error_message') {
			return `Error : Apply Failed`;
		}
		if (filename == 'return_error') {
			throw new Error('Failed to apply terraform');
		}
		return `FileName ${filename} is applied`;
	}),
	ApplyTemplateLocally: vi.fn(
		async (filename: string, apiKey: string) =>
			`FileName ${filename} is applied locally.`,
	),
	getResourceAndAction: vi.fn(() => ({
		resource: 'resource',
		action: 'action',
	})),
}));

const enter = '\r';
const arrowUp = '\u001B[A';
const arrowDown = '\u001B[B';

describe('Render the selection and apply the component', () => {
	const demoPermitKey = 'permit_key_a'.concat('a'.repeat(96));
	it('renders the component', async () => {
		const { stdout, stdin } = render(<ApplyComponent apiKey={demoPermitKey} />);
		expect(stdout.lastFrame()).contains('template1');
		expect(stdout.lastFrame()).contains('template2');
		await delay(50);
		stdin.write(arrowDown);
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(stdout.lastFrame()).contain('FileName template2 is applied');
	});

	it('Checks for local argument', async () => {
		const { stdin, stdout } = render(<ApplyComponent local />);
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(stdout.lastFrame()).contains(
			'FileName template1 is applied locally.',
		);
	});
	it('given predefined template', async () => {
		const { stdout } = render(<ApplyComponent template="template2" />);
		await delay(50);
		expect(stdout.lastFrame()).contains('FileName template2 is applied');
	});
	it('should Show error message', async () => {
		const { stdout } = render(<ApplyComponent template="error_message" />);
		await delay(50);
		expect(stdout.lastFrame()).contains('Error : Apply Failed');
	});
	it('Should throw error', async () => {
		const { stdout } = render(
			<ApplyComponent template="return_error"></ApplyComponent>,
		);
		await delay(50);
		expect(stdout.lastFrame()).contains('Failed to apply terraform');
	});
});
