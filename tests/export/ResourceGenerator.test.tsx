import { expect, describe, it, beforeEach } from 'vitest';
import { RelationGenerator } from '../../source/commands/env/export/generators/RelationGenerator';
import { getMockPermit } from './mocks/permit';
import { createWarningCollector } from '../../source/commands/env/export/utils';

describe('RelationGenerator', () => {
	let generator: RelationGenerator;

	beforeEach(() => {
		generator = new RelationGenerator(
			getMockPermit(),
			createWarningCollector(),
		);
	});

	it('generates empty string when no resources exist', async () => {
		const mockPermit = getMockPermit();
		mockPermit.api.resources.list.mockResolvedValueOnce([]);

		const generator = new RelationGenerator(
			mockPermit,
			createWarningCollector(),
		);
		const result = await generator.generateHCL();

		// implementation returns an empty string when no resources exist
		expect(result).toBe('');
	});

	it('skips internal user resource', async () => {
		const mockPermit = getMockPermit();
		mockPermit.api.resources.list.mockResolvedValueOnce([
			{ key: '__user', relations: [] },
		]);

		const generator = new RelationGenerator(
			mockPermit,
			createWarningCollector(),
		);
		const result = await generator.generateHCL();

		expect(result).toBe('\n# Resource Relations\n');
	});

	it('generates valid HCL for relations', async () => {
		const mockPermit = getMockPermit();
		mockPermit.api.resources.list.mockResolvedValueOnce([
			{
				key: 'document',
				relations: [
					{
						key: 'owner',
						name: 'Owner',
						object_resource: 'user',
						subject_resource: 'document',
					},
				],
			},
		]);

		const generator = new RelationGenerator(
			mockPermit,
			createWarningCollector(),
		);
		const result = await generator.generateHCL();

		expect(result).toContain('\n# Resource Relations\n');
		expect(result).toContain('resource "permitio_relation"');
		expect(result).toContain('"document_owner"');
		expect(result).toContain('"owner"');
	});

	it('handles errors when fetching relations', async () => {
		const mockPermit = getMockPermit();
		mockPermit.api.resources.list.mockRejectedValueOnce(
			new Error('Failed to fetch'),
		);

		const warningCollector = createWarningCollector();
		const generator = new RelationGenerator(mockPermit, warningCollector);
		const result = await generator.generateHCL();

		expect(result).toBe('');
		expect(warningCollector.getWarnings()).toContain(
			'Failed to fetch resource relations: Failed to fetch',
		);
	});

	it('skips invalid relations', async () => {
		const mockPermit = getMockPermit();
		mockPermit.api.resources.list.mockResolvedValueOnce([
			{
				key: 'document',
				relations: [
					{
						key: 'owner',
					},
				],
			},
		]);

		const warningCollector = createWarningCollector();
		const generator = new RelationGenerator(mockPermit, warningCollector);
		const result = await generator.generateHCL();

		expect(result).toBe('\n# Resource Relations\n');
		expect(warningCollector.getWarnings()).toContain(
			'Invalid relation in resource document: Missing required fields',
		);
	});
});
