import { FlatCompat } from '@eslint/eslintrc';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import sonarjsPlugin from 'eslint-plugin-sonarjs';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import prettierPlugin from 'eslint-plugin-prettier';
import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

const compat = new FlatCompat({
	baseDirectory: import.meta.url,
});

const eslintConfig = [
	js.configs.recommended,
	...compat.extends('plugin:react/recommended'),
	prettierConfig,
];

export default [
	...eslintConfig,
	{
		ignores: ["source/lib/api/"]
	},
	{
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
				ecmaFeatures: {
					jsx: true,
				},
			},
			globals: {
				...globals.browser,
				Headers: 'readonly',
				RequestInit: 'readonly',
				fetch: 'readonly',
				process: 'readonly',
			},
		},
	},
	{
		files: ['source/**/*.{js,ts,tsx}', '*/.{js,ts,jsx,tsx}'],
		plugins: {
			'@typescript-eslint': tsPlugin,
			sonarjs: sonarjsPlugin,
			react: reactPlugin,
			'react-hooks': reactHooksPlugin,
			prettier: prettierPlugin,
		},
		rules: {
			...reactPlugin.configs.recommended.rules,
			...reactHooksPlugin.configs.recommended.rules,
			...tsPlugin.configs['recommended'].rules,
			'no-use-before-define': 'warn',
			'@typescript-eslint/no-unused-vars': 'warn',
			'sonarjs/no-identical-functions': 'error',
			'sonarjs/no-duplicate-string': 'error',
			'prettier/prettier': 'warn',
		},
	},
	{
		settings: {
			react: { version: 'detect' },
		},
	},
];
