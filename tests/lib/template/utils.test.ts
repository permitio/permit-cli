import { describe, it, vi, expect, beforeAll } from 'vitest';
import * as util from '../../../source/lib/env/template/utils';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';

vi.mock('fs');
vi.mock('path');
vi.mock('child_process');

describe('Template Utils Tests', () => {
	beforeAll(() => {
		vi.clearAllMocks();
	});
	it('should return list of template file names', () => {
		const mockFiles = ['template1.tf', 'template2.tf'];
		vi.spyOn(fs, 'readdirSync').mockReturnValue(mockFiles);
		vi.spyOn(path, 'parse').mockImplementation(file => ({
			name: file.split('.')[0],
		}));

		const result = util.getFiles();
		expect(result).toEqual(['template1', 'template2']);
	});

	it('should apply template via API successfully', async () => {
		const mockFileContent = 'Some terraform content with {{API_KEY}}';
		const mockApiKey = 'mock-api-key';
		const mockFileName = 'template1';
		const mockResponse = { ok: true, json: vi.fn().mockResolvedValue({}) };

		vi.spyOn(fs, 'readFileSync').mockReturnValue(mockFileContent);
		global.fetch = vi.fn().mockResolvedValue(mockResponse);

		const result = await util.ApplyTemplate(mockFileName, mockApiKey);
		expect(result).toEqual(
			'Success: The environment template is applied successfully.',
		);
	});

	it('should return an error if API request fails', async () => {
		const mockFileContent = 'some terraform content';
		const mockApiKey = 'mock-api-key';
		const mockFileName = 'template1';
		const mockResponse = {
			ok: false,
			status: 400,
			json: vi.fn().mockResolvedValue({ error: 'Bad Request' }),
		};

		vi.spyOn(fs, 'readFileSync').mockReturnValue(mockFileContent);
		global.fetch = vi.fn().mockResolvedValue(mockResponse);

		const result = await util.ApplyTemplate(mockFileName, mockApiKey);
		expect(result).toEqual(
			'Error: Request failed with status code: 400: Bad Request',
		);
	});

	it('should apply Terraform template locally', async () => {
		const mockFileContent = 'some terraform content with {{API_KEY}}';
		const mockApiKey = 'mock-api-key';
		const mockFileName = 'template1';
		const tempDir = 'mock-temp-dir';
		const tempPath = path.join(tempDir, 'config.tf');

		vi.spyOn(fs, 'readFileSync').mockReturnValue(mockFileContent);
		vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
		vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
		vi.spyOn(fs, 'rmSync').mockImplementation(() => {});
		vi.spyOn(path, 'join').mockReturnValue(tempPath);

		// Mock `execSync` correctly
		vi.spyOn(child_process, 'execSync').mockImplementation(() => {
			return `terraform output`;
		});

		const result = await util.ApplyTemplateLocally(mockFileName, mockApiKey);
		expect(result).toContain(
			'Success: Terraform applied successfully.\nTerraform Output: terraform output',
		);
	});

	it('should return an error if Terraform command fails', async () => {
		const mockFileContent = 'some terraform content with {{API_KEY}}';
		const mockApiKey = 'mock-api-key';
		const mockFileName = 'template1';
		const tempDir = 'mock-temp-dir';
		const tempPath = path.join(tempDir, 'config.tf');

		vi.spyOn(fs, 'readFileSync').mockReturnValue(mockFileContent);
		vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
		vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
		vi.spyOn(fs, 'rmSync').mockImplementation(() => {});
		vi.spyOn(path, 'join').mockReturnValue(tempPath);
		vi.spyOn(child_process, 'execSync').mockImplementation(() => {
			throw new Error('mock error');
		});
		// Properly mock `execSync` to throw an error

		const result = await util.ApplyTemplateLocally(mockFileName, mockApiKey);

		expect(result).toBe('Error: mock error');
	});
});
