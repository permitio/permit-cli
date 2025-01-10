import { expect, describe, it } from 'vitest';
import {
	createSafeId,
	createWarningCollector,
	generateProviderBlock,
} from '../../source/commands/env/export/utils.js';

describe('Export Utils', () => {
	describe('createSafeId', () => {
		it('creates safe identifier', () => {
			expect(createSafeId('test-id')).toBe('test_id');
		});
	});

	describe('createWarningCollector', () => {
		it('collects warnings', () => {
			const collector = createWarningCollector();
			collector.addWarning('test warning');
			expect(collector.getWarnings()).toContain('test warning');
		});
	});
});
