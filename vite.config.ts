import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
	plugins: [
		react(), // React plugin for Vite
		nodePolyfills({
			include: ['events'], // Polyfill for node-specific APIs
		}),
	],
	test: {
		include: ['src/tests/**/*.test.tsx'],
		globals: true, // Enable global test functions like describe, it
		environment: 'jsdom', // Set the test environment to 'jsdom' for DOM testing
		coverage: {
			enabled: true,
			provider: 'istanbul', // Use Istanbul for coverage reporting
			reporter: ['text', 'html', 'text-summary'], // Output both text and HTML reports
		},
	},
});
