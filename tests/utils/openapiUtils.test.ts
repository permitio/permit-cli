import { describe, it, expect } from 'vitest';
import { 
  sanitizeKey,
  isDuplicateError 
} from '../../source/utils/openapiUtils';

describe('openapiUtils', () => {
  describe('sanitizeKey', () => {
    it('should replace colons with underscores', () => {
      expect(sanitizeKey('user:admin')).toBe('user_admin');
    });

    it('should handle multiple colons', () => {
      expect(sanitizeKey('org:project:resource')).toBe('org_project_resource');
    });

    it('should leave other characters unchanged', () => {
      expect(sanitizeKey('resource-123_abc')).toBe('resource-123_abc');
    });

    it('should handle empty strings', () => {
      expect(sanitizeKey('')).toBe('');
    });
  });

  describe('isDuplicateError', () => {
    it('should identify string errors containing DUPLICATE_ENTITY', () => {
      expect(isDuplicateError('Error: DUPLICATE_ENTITY')).toBe(true);
    });

    it('should identify string errors containing "already exists"', () => {
      expect(isDuplicateError('The resource already exists')).toBe(true);
    });

    it('should identify object errors with error_code DUPLICATE_ENTITY', () => {
      const error = { error_code: 'DUPLICATE_ENTITY', message: 'Entity already exists' };
      expect(isDuplicateError(error)).toBe(true);
    });

    it('should identify JSON string errors with error_code DUPLICATE_ENTITY', () => {
      const errorStr = JSON.stringify({ error_code: 'DUPLICATE_ENTITY' });
      expect(isDuplicateError(errorStr)).toBe(true);
    });

    it('should identify JSON string errors with title containing "already exists"', () => {
      const errorStr = JSON.stringify({ title: 'This role already exists' });
      expect(isDuplicateError(errorStr)).toBe(true);
    });

    it('should return false for non-duplicate errors', () => {
      expect(isDuplicateError('Not found error')).toBe(false);
      expect(isDuplicateError({ error_code: 'NOT_FOUND' })).toBe(false);
      expect(isDuplicateError(null)).toBe(false);
      expect(isDuplicateError(undefined)).toBe(false);
    });

    it('should handle invalid JSON strings gracefully', () => {
      expect(isDuplicateError('{not-valid-json}')).toBe(false);
    });
  });
});