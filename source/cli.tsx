#!/usr/bin/env node
import Pastel from 'pastel';
import './i18n'; 

const app = new Pastel({
	importMeta: import.meta,
});

await app.run();
