import { describe, vi, expect, it } from 'vitest';

vi.mock('pastel', () => ({
	default: vi.fn().mockImplementation(() => ({
		run: vi.fn(() => Promise.resolve()),
	})),
	option: vi.fn(config => config),
}));

import Pastel from 'pastel';

describe('Cli script', () => {
	it('Should run the pastel app', async () => {
		await import('../source/cli.js');
		expect(Pastel).toHaveBeenCalled();
		const pastelInstance = (Pastel as any).mock.results[0].value;
		expect(pastelInstance.run).toHaveBeenCalled();
	});
});
