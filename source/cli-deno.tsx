#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-env --allow-run --allow-sys
import React from 'react';
import { render } from 'ink';
import Pastel from 'pastel';

const app = new Pastel({
	importMeta: import.meta,
	name: 'permit',
});

await app.run(); 