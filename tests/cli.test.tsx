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

	it('Should exit with the retired-region error when PERMIT_REGION=eu', async () => {
		vi.resetModules();
		vi.mocked(Pastel).mockClear();
		process.env.PERMIT_REGION = 'eu';
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((
			code?: number,
		) => {
			throw new Error(`process.exit(${code})`);
		}) as never);
		try {
			await expect(import('../source/cli.js')).rejects.toThrow(
				'process.exit(1)',
			);
			const { EU_REGION_RETIRED_MESSAGE } = await import('../source/config.js');
			expect(errorSpy).toHaveBeenCalledWith(EU_REGION_RETIRED_MESSAGE);
			expect(Pastel).not.toHaveBeenCalled();
		} finally {
			delete process.env.PERMIT_REGION;
			errorSpy.mockRestore();
			exitSpy.mockRestore();
		}
	});
});
