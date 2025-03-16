import { vi } from 'vitest';

export const mockUseAuth = vi.fn(() => ({
	authToken: 'mock-auth-token',
}));
