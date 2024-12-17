import { describe, vi, it, expect } from 'vitest';
import * as api from '../../source/lib/api';
global.fetch = vi.fn();
describe('API', () => {
	it('should call the apiCall', async () => {
		(fetch as any).mockResolvedValueOnce({
			headers: {},
			ok: true,
			status: 200,
			json: async () => ({ id: 'testId', name: 'testName' }),
		});
		const response = await api.apiCall<{ id: string; name: string }>(
			'testEndpoint',
			'testToken',
			'testCookie',
			'GET',
			'testBody',
		);
		expect(response.status).toBe(200);
		expect(response.response.id).toBe('testId');
		expect(response.response.name).toBe('testName');
		expect(response.headers).toEqual({});
	});
});
