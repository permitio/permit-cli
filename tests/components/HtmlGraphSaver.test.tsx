import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolve } from 'path';
import open from 'open';
import { saveHTMLGraph } from '../../source/components/HtmlGraphSaver';
import * as fs from 'fs';

// Mock the 'open' module
vi.mock('open', () => ({
	default: vi.fn(() => Promise.resolve()),
}));

// Mock the 'fs' module; this must happen before the module under test is imported
vi.mock('fs', () => ({
	writeFileSync: vi.fn(),
}));

describe('saveHTMLGraph', () => {
	let consoleLogSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should write the HTML file and open it', () => {
		const dummyGraphData = { nodes: [], edges: [] };
		saveHTMLGraph(dummyGraphData);

		const expectedPath = resolve(process.cwd(), 'permit-graph.html');

		expect(fs.writeFileSync).toHaveBeenCalledWith(
			expectedPath,
			expect.stringContaining('<!doctype html>'),
			'utf8'
		);

		expect(consoleLogSpy).toHaveBeenCalledWith(`Graph saved as: ${expectedPath}`);

		expect(open).toHaveBeenCalledWith(expectedPath);
	});
});
