import { describe, it, vi, expect } from 'vitest';
import * as util from '../../../source/lib/env/template/utils';
import * as fs from 'fs';
import * as path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { V } from 'vitest/dist/chunks/reporters.D7Jzd9GS.js';

vi.mock('fs');
vi.mock('path');
vi.mock('os');
vi.mock('child_process');

describe('Test for the template utils', () => {
	it('getfiles function', async () => {
		const mockFiles = ['template1.tf', 'template2.tf'];
		vi.spyOn(fs, 'readdirSync').mockReturnValue(mockFiles);
		vi.spyOn(path, 'parse').mockImplementation(file => ({
			name: file.split('.')[0],
		}));

		const result = util.getFiles();
		expect(result).toEqual(['template1', 'template2']);
	});
	it('should apply terraform template via API', async () => {
		const mockFileContent = `Some terraform contet with {{API_KEY}}`;
		const mockApiKey = 'permit_key_a'.concat('a'.repeat(96));
		const mockFileName = 'template1';
		const mockResponse = { ok: true, json: vi.fn().mockResolvedValue({}) };
		vi.spyOn(fs, 'readFileSync').mockReturnValue(mockFileContent);
		global.fetch = vi.fn().mockResolvedValue(mockResponse);
		const result = await util.ApplyTemplate(mockFileName, mockApiKey);
		expect(result).toEqual(
			'Success: The terraform template is applied successfully.',
		);
	});
	it('should return error if API request fails', async () => {
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
	it('should apply terraform template locally', async () => {
		const mockFileContent = 'some terraform content with {{API_KEY}}';
		const mockApiKey = 'mock-api-key';
		const mockFileName = 'template1';
		const tempDir = 'mock-temp-dir';
		const tempPath = path.join(tempDir, 'main.tf');

		vi.spyOn(fs, 'readFileSync').mockReturnValue(mockFileContent);
		vi.spyOn(os, 'tmpdir').mockReturnValue('/tmp');
		vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
		vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
		vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
		vi.spyOn(fs, 'rmdirSync').mockImplementation(() => {});
		vi.spyOn(path, 'join').mockReturnValue(tempPath);

		const execMock = vi.fn((cmd, options, callback) => {
			callback(null, 'terraform output', '');
		});
		(exec as any).mockImplementation(execMock);

		const result = await util.ApplyTemplateLocally(mockFileName, mockApiKey);
		expect(result).toEqual(
			'Success: Terraform Appled successfully \n Terraform Output: terraform output',
		);
	});
	it('should return error if terraform command fails', async () => {
		const mockFileContent = 'some terraform content with {{API_KEY}}';
		const mockApiKey = 'mock-api-key';
		const mockFileName = 'template1';
		const tempDir = 'mock-temp-dir';
		const tempPath = path.join(tempDir, 'main.tf');

		vi.spyOn(fs, 'readFileSync').mockReturnValue(mockFileContent);
		vi.spyOn(os, 'tmpdir').mockReturnValue('/tmp');
		vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
		vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
		vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
		vi.spyOn(fs, 'rmdirSync').mockImplementation(() => {});
		vi.spyOn(path, 'join').mockReturnValue(tempPath);

		const execMock = vi.fn((cmd, options, callback) => {
			callback(new Error('mock error'), '', 'mock stderr');
		});
		(exec as any).mockImplementation(execMock);

		const result = await util.ApplyTemplateLocally(mockFileName, mockApiKey);
		expect(result).toEqual('Error: mock error');
	});
});
