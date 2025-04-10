import { describe, it, expect } from 'vitest';
import {
	collectResourceTypes,
	isValidAuditContext,
	normalizeDetailedLog,
	createPdpRequest,
} from '../../source/components/test/auditUtils.js';
import {
	AuditLog,
	AuditContext,
	DetailedAuditLog,
} from '../../source/components/test/auditTypes.js';

describe('collectResourceTypes', () => {
	it('should collect all unique resource types from audit logs', () => {
		const logs: AuditLog[] = [
			{
				id: '1',
				timestamp: '2023-01-01',
				action: 'read',
				tenant: 'default',
				decision: true,
				resource_type: 'document',
			},
			{
				id: '2',
				timestamp: '2023-01-01',
				action: 'write',
				tenant: 'default',
				decision: false,
				resource_type: 'document',
			},
			{
				id: '3',
				timestamp: '2023-01-01',
				action: 'delete',
				tenant: 'default',
				decision: true,
				resource_type: 'folder',
			},
			{
				id: '4',
				timestamp: '2023-01-01',
				action: 'read',
				tenant: 'default',
				decision: true,
				resource_type: 'user',
			},
			{
				id: '5',
				timestamp: '2023-01-01',
				action: 'read',
				tenant: 'default',
				decision: true,
			},
		];

		const types = collectResourceTypes(logs);
		expect(types.size).toBe(3);
		expect(types.has('document')).toBe(true);
		expect(types.has('folder')).toBe(true);
		expect(types.has('user')).toBe(true);
	});

	it('should return empty set when no resource types exist', () => {
		const logs: AuditLog[] = [
			{
				id: '1',
				timestamp: '2023-01-01',
				action: 'read',
				tenant: 'default',
				decision: true,
			},
			{
				id: '2',
				timestamp: '2023-01-01',
				action: 'write',
				tenant: 'default',
				decision: false,
			},
		];

		const types = collectResourceTypes(logs);
		expect(types.size).toBe(0);
	});
});

describe('isValidAuditContext', () => {
	it('should return true for valid audit context', () => {
		const validContext: AuditContext = {
			user: { id: 'user1' },
			resource: { type: 'document', id: 'doc1' },
			tenant: 'default',
			action: 'read',
		};
		expect(isValidAuditContext(validContext)).toBe(true);
	});

	it('should return false for invalid audit context', () => {
		// Missing required fields
		const invalidContext1 = {
			user: { id: 'user1' },
			tenant: 'default',
			action: 'read',
		};
		expect(isValidAuditContext(invalidContext1)).toBe(false);

		// Wrong types
		const invalidContext2 = {
			user: 'user1', // Not an object
			resource: { type: 'document', id: 'doc1' },
			tenant: 'default',
			action: 'read',
		};
		expect(isValidAuditContext(invalidContext2)).toBe(false);

		// Null value
		expect(isValidAuditContext(null)).toBe(false);

		// Undefined
		expect(isValidAuditContext(undefined)).toBe(false);
	});
});

describe('normalizeDetailedLog', () => {
	it('should normalize and return a detailed log with all fields', () => {
		const originalLog: AuditLog = {
			id: '1',
			timestamp: '2023-01-01T00:00:00Z',
			user_key: 'user1',
			resource: 'doc1',
			resource_type: 'document',
			action: 'read',
			tenant: 'default',
			decision: true,
		};

		const responseData = {
			id: '1',
			timestamp: '2023-01-01T00:00:00Z',
			user_key: 'user1',
			resource: 'doc1',
			resource_type: 'document',
			action: 'read',
			tenant: 'default',
			decision: true,
			context: {
				user: { id: 'user1', key: 'user1' },
				resource: { type: 'document', id: 'doc1' },
				tenant: 'default',
				action: 'read',
			},
		};

		const detailedLog = normalizeDetailedLog(responseData, originalLog);

		expect(detailedLog).not.toBeNull();
		expect(detailedLog?.id).toBe('1');
		expect(detailedLog?.user_id).toBe('user1');
		expect(detailedLog?.resource_type).toBe('document');
		expect(detailedLog?.context).toEqual(responseData.context);
	});

	it('should use default values when fields are missing', () => {
		const originalLog: AuditLog = {
			id: '1',
			timestamp: '2023-01-01T00:00:00Z',
			user_key: 'user1',
			action: 'read',
			tenant: null,
			decision: true,
		};

		const responseData = {
			id: '1',
			user_key: 'user1',
			action: 'read',
			decision: true,
		};

		const detailedLog = normalizeDetailedLog(responseData, originalLog);

		expect(detailedLog).not.toBeNull();
		expect(detailedLog?.user_id).toBe('user1');
		expect(detailedLog?.tenant).toBe('default'); // Default value
		expect(detailedLog?.resource).toBe(''); // Default value
	});

	it('should return null when no user identifier is found', () => {
		const originalLog: AuditLog = {
			id: '1',
			timestamp: '2023-01-01T00:00:00Z',
			action: 'read',
			tenant: 'default',
			decision: true,
		};

		const responseData = {
			id: '1',
			action: 'read',
			decision: true,
		};

		const detailedLog = normalizeDetailedLog(responseData, originalLog);

		expect(detailedLog).toBeNull();
	});

	it('should handle invalid context and create a default one', () => {
		const originalLog: AuditLog = {
			id: '1',
			timestamp: '2023-01-01T00:00:00Z',
			user_key: 'user1',
			action: 'read',
			tenant: 'default',
			decision: true,
		};

		const responseData = {
			id: '1',
			user_key: 'user1',
			action: 'read',
			decision: true,
			context: 'not an object', // Invalid context
		};

		const detailedLog = normalizeDetailedLog(responseData, originalLog);

		expect(detailedLog).not.toBeNull();
		expect(detailedLog?.context).toMatchObject({
			user: { id: 'user1', key: 'user1' },
			action: 'read',
			tenant: 'default',
		});
		// Just check that resource exists without expecting a specific type
		expect(detailedLog?.context?.resource).toBeDefined();
	});
});

describe('createPdpRequest', () => {
	it('should create a valid PDP request from a detailed log', () => {
		const detailedLog: DetailedAuditLog = {
			id: '1',
			timestamp: '2023-01-01T00:00:00Z',
			user_id: 'user1',
			user_key: 'user1',
			resource: 'doc1',
			resource_type: 'document',
			action: 'read',
			tenant: 'default',
			decision: true,
		};

		const request = createPdpRequest(detailedLog);

		expect(request.tenant).toBe('default');
		expect(request.action).toBe('read');
		expect(request.user.key).toBe('user1');
		expect(request.user.attributes).toEqual({});
		expect(request.resource.type).toBe('document');
		expect(request.resource.key).toBe('doc1');
		expect(request.resource.attributes).toEqual({});
	});

	it('should handle missing fields with defaults', () => {
		const detailedLog: DetailedAuditLog = {
			id: '1',
			timestamp: '2023-01-01T00:00:00Z',
			user_id: 'user1',
			action: 'read',
			tenant: null,
			decision: true,
		};

		const request = createPdpRequest(detailedLog);

		expect(request.tenant).toBe('default');
		expect(request.action).toBe('read');
		expect(request.user.key).toBe('user1');
		expect(request.resource.type).toBe('resource');
	});

	it('should handle ReBAC resource format', () => {
		const detailedLog: DetailedAuditLog = {
			id: '1',
			timestamp: '2023-01-01T00:00:00Z',
			user_id: 'user1',
			user_key: 'user1',
			resource: 'document:123',
			resource_type: '',
			action: 'read',
			tenant: 'default',
			decision: true,
		};

		const request = createPdpRequest(detailedLog);

		expect(request.tenant).toBe('default');
		expect(request.action).toBe('read');
		expect(request.user.key).toBe('user1');
		expect(request.resource.type).toBe('document');
		expect(request.resource.key).toBe('document:123');
	});

	it('should include context data when available', () => {
		const detailedLog: DetailedAuditLog = {
			id: '1',
			timestamp: '2023-01-01T00:00:00Z',
			user_id: 'user1',
			user_key: 'user1',
			resource: 'doc1',
			resource_type: 'document',
			action: 'read',
			tenant: 'default',
			decision: true,
			context: {
				user: {
					id: 'user1',
					key: 'user1',
					attributes: { role: 'admin' },
				},
				resource: {
					type: 'document',
					id: 'doc1',
					attributes: { department: 'engineering' },
				},
				tenant: 'default',
				action: 'read',
				context: { custom: 'data' },
			},
		};

		const request = createPdpRequest(detailedLog);

		expect(request.user.attributes).toEqual({ role: 'admin' });
		expect(request.resource.attributes).toEqual({ department: 'engineering' });
		expect(request.context).toEqual({ custom: 'data' });
	});
});
