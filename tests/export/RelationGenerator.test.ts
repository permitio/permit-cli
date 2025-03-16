import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RelationGenerator } from '../../source/commands/env/export/generators/RelationGenerator';
import type { WarningCollector } from '../../source/commands/env/export/types';

describe('RelationGenerator', () => {
	let warningCollector: WarningCollector;
	let mockPermit: any;

	beforeEach(() => {
		warningCollector = {
			addWarning: vi.fn(),
			getWarnings: vi.fn().mockReturnValue([]),
		};

		mockPermit = {
			api: {
				resources: {
					list: vi.fn().mockResolvedValue([]),
				},
				resourceRelations: {
					list: vi.fn().mockResolvedValue([]),
				},
			},
		};
	});

	it('generates empty string when no resources exist', async () => {
		mockPermit.api.resources.list.mockResolvedValue([]);

		const generator = new RelationGenerator(mockPermit, warningCollector);
		const result = await generator.generateHCL();

		expect(result).toBe('');
	});

	it('handles resources with no relations', async () => {
		// Setup resources but no relations
		mockPermit.api.resources.list.mockResolvedValue([
			{ key: 'document', name: 'Document' },
			{ key: 'user', name: 'User' },
		]);

		// Mock empty relations list
		mockPermit.api.resourceRelations.list.mockResolvedValue([]);

		const generator = new RelationGenerator(mockPermit, warningCollector);
		const result = await generator.generateHCL();

		expect(result).toBe('');
	});

	it('generates valid HCL for relations', async () => {
		// Setup resources
		mockPermit.api.resources.list.mockResolvedValue([
			{ key: 'document', name: 'Document' },
			{ key: 'user', name: 'User' },
		]);

		// Setup relations with option to handle both array and paginated responses
		mockPermit.api.resourceRelations.list.mockImplementation(
			({ resourceKey }) => {
				if (resourceKey === 'document') {
					return Promise.resolve([
						{
							key: 'owner',
							name: 'Owner',
							description: 'Document owner',
							subject_resource: 'user',
							object_resource: 'document',
						},
					]);
				}
				return Promise.resolve([]);
			},
		);

		const generator = new RelationGenerator(mockPermit, warningCollector);
		const result = await generator.generateHCL();

		// Check basic structure
		expect(result).toContain('# Relations');

		// Check content for essential parts without being too strict about format
		expect(result).toContain('permitio_relation');
		expect(result).toContain('owner');
		expect(result).toContain('Owner');
		expect(result).toContain('user');
		expect(result).toContain('document');
	});

	it('handles errors when fetching relations', async () => {
		// Setup resources
		mockPermit.api.resources.list.mockResolvedValue([
			{ key: 'document', name: 'Document' },
		]);

		// Make resourceRelations.list throw an error
		mockPermit.api.resourceRelations.list.mockRejectedValue(
			new Error('API error'),
		);

		const generator = new RelationGenerator(mockPermit, warningCollector);
		await generator.generateHCL();

		// Check that the warning was added
		expect(warningCollector.addWarning).toHaveBeenCalled();

		// Check that the warning message contains the expected parts
		const warningCall = warningCollector.addWarning.mock.calls[0][0];
		expect(warningCall).toContain(
			"Failed to get relations for resource 'document'",
		);
		expect(warningCall).toContain('API error');
	});

	it('skips invalid relations', async () => {
		// Setup resources
		mockPermit.api.resources.list.mockResolvedValue([
			{ key: 'document', name: 'Document' },
		]);

		// Return relations with missing required fields
		mockPermit.api.resourceRelations.list.mockResolvedValue([
			{
				// Missing key
				name: 'Invalid Relation',
				// Missing subject_resource or object_resource
			},
		]);

		const generator = new RelationGenerator(mockPermit, warningCollector);
		const result = await generator.generateHCL();

		// Should produce empty result as all relations are invalid
		expect(result).toBe('');
	});

	it('handles paginated responses', async () => {
		// Setup resources
		mockPermit.api.resources.list.mockResolvedValue([
			{ key: 'document', name: 'Document' },
		]);

		// Return a paginated response instead of an array
		mockPermit.api.resourceRelations.list.mockResolvedValue({
			data: [
				{
					key: 'owner',
					name: 'Owner',
					subject_resource: 'user',
					object_resource: 'document',
				},
			],
			pagination: {
				total_count: 1,
				page: 1,
				per_page: 10,
			},
		});

		const generator = new RelationGenerator(mockPermit, warningCollector);
		const result = await generator.generateHCL();

		// Should contain relation data
		expect(result).toContain('# Relations');
		expect(result).toContain('permitio_relation');
	});

	it('handles HTML entities in relation names and descriptions', async () => {
		// Setup resources
		mockPermit.api.resources.list.mockResolvedValue([
			{ key: 'document', name: 'Document' },
			{ key: 'user', name: 'User' },
		]);

		// Return a relation with HTML entities
		mockPermit.api.resourceRelations.list.mockResolvedValue([
			{
				key: 'owner',
				name: 'Owner &amp; Creator',
				description: 'Document &lt;owner&gt;',
				subject_resource: 'user',
				object_resource: 'document',
			},
		]);

		const generator = new RelationGenerator(mockPermit, warningCollector);
		const result = await generator.generateHCL();

		expect(result).toContain('Owner & Creator');

		expect(result).toContain('resource "permitio_relation"');
		expect(result).toContain('key              = "owner"');
	});
});
