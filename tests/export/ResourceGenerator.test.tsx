import { expect, describe, it, beforeEach } from 'vitest';
import { ResourceGenerator } from '../../source/commands/env/export/generators/ResourceGenerator';
import { getMockPermit } from './mocks/permit';
import { createWarningCollector } from '../../source/commands/env/export/utils';

describe('ResourceGenerator', () => {
	let generator: ResourceGenerator;

	beforeEach(() => {
		generator = new ResourceGenerator(
			getMockPermit(),
			createWarningCollector(),
		);
	});

	it('generates empty string when no resources exist', async () => {
		const mockPermit = getMockPermit();
		mockPermit.api.resources.list.mockResolvedValueOnce([]);
		const generator = new ResourceGenerator(
			mockPermit,
			createWarningCollector(),
		);
		const result = await generator.generateHCL();
		expect(result).toBe('');
	});

	it('skips internal user resource', async () => {
		const mockPermit = getMockPermit();
		mockPermit.api.resources.list.mockResolvedValueOnce([
			{ key: '__user', name: 'User', actions: {}, attributes: {} },
		]);
		const generator = new ResourceGenerator(
			mockPermit,
			createWarningCollector(),
		);
		const result = await generator.generateHCL();
		expect(result).toBe('');
	});

	it('generates valid HCL for resources', async () => {
		const mockPermit = getMockPermit();
		mockPermit.api.resources.list.mockResolvedValueOnce([
			{
				key: 'document',
				name: 'Document',
				description: 'A document resource',
				actions: {
					read: { name: 'Read', description: 'Read the document' },
				},
				attributes: {
					owner: { type: 'string', description: 'The owner of the document' },
				},
			},
		]);
		const generator = new ResourceGenerator(
			mockPermit,
			createWarningCollector(),
		);
		const result = await generator.generateHCL();

		// Basic structure checks
		expect(result).toContain('# Resources');
		expect(result).toContain('resource "permitio_resource" "document"');

		// Resource properties
		expect(result).toContain('key');
		expect(result).toContain('document');
		expect(result).toContain('name');
		expect(result).toContain('Document');
		expect(result).toContain('description');
		expect(result).toContain('A document resource');

		// Actions section
		expect(result).toContain('actions');
		expect(result).toContain('read');
		expect(result).toContain('Read');
		expect(result).toContain('Read the document');

		// Attributes section
		expect(result).toContain('attributes');
		expect(result).toContain('owner');
		expect(result).toContain('string');

		// Print output for debugging if needed
		// console.log(result);
	});

	it('handles errors when fetching resources', async () => {
		const mockPermit = getMockPermit();
		mockPermit.api.resources.list.mockRejectedValueOnce(
			new Error('Failed to fetch'),
		);
		const warningCollector = createWarningCollector();
		const generator = new ResourceGenerator(mockPermit, warningCollector);
		const result = await generator.generateHCL();
		expect(result).toBe('');
		expect(warningCollector.getWarnings()).toEqual([
			'Failed to export resources: Error: Failed to fetch',
		]);
	});
});
