#!/usr/bin/env node
import Pastel from 'pastel';
import './i18n.ts';

const app = new Pastel({
	importMeta: import.meta,
	name: 'permit',
});

await app.run();
