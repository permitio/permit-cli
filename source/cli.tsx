#!/usr/bin/env node
import Pastel from 'pastel';
import { getRegion, RetiredRegionError } from './config.js';

// Fail fast, before any command runs or any request is made, when
// PERMIT_REGION points at a retired region (e.g. 'eu').
try {
	getRegion();
} catch (error) {
	if (error instanceof RetiredRegionError) {
		console.error(error.message);
		process.exit(1);
	}
	throw error;
}

const app = new Pastel({
	importMeta: import.meta,
	name: 'permit',
});

await app.run();
