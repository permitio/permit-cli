import React from 'react';
import { render } from 'ink-testing-library';
import Apply from "../source/commands/env/template/apply";
import {vi, describe, it, expect} from 'vitest';
import {loadAuthToken} from "../source/lib/auth.js"
import {useEnvironmentApi} from "../source/hooks/useEnvironmentAPI";


const demoPermitKey = 'permit_key_'.concat('a'.repeat(97));

vi.mock('../source/lib/auth.js', async () => {
	const original = await vi.importActual('../source/lib/auth.js');
	return {
		...original,
		loadAuthToken: vi.fn(() => demoPermitKey),
	};
});

