import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../AuthProvider.js';
import { Text } from 'ink';
import {
	generateJestSample,
	generatePytestSample,
	generateVitestSample,
} from '../../../utils/codeSnippets.js';
import { saveFile } from '../../../utils/fileSaver.js';
import Spinner from 'ink-spinner';

type frameworkProps = {
	framework: 'jest' | 'pytest' | 'vitest';
	configPath?: string;
	path?: string;
	pdpUrl?: string;
};

export function CodeSampleComponent({
	framework,
	configPath,
	path,
	pdpUrl,
}: frameworkProps) {
	const [code, setCode] = useState<string | undefined>(undefined);
	const [state, setState] = useState<'loading' | 'done'>('loading');
	const [error, setError] = useState<string | undefined>(undefined);
	const auth = useAuth();

	useEffect(() => {
		if (error || state === 'done') {
			process.exit(1);
		}
	}, [error, state]);

	useEffect(() => {
		if (auth.loading) return;
		if (framework === 'jest') {
			setCode(generateJestSample(pdpUrl, configPath, auth.authToken));
		} else if (framework === 'pytest') {
			setCode(generatePytestSample(pdpUrl, configPath, auth.authToken));
		} else if (framework === 'vitest') {
			setCode(generateVitestSample(pdpUrl, configPath, auth.authToken));
		}
		if (!path) {
			setState('done');
		}
	}, [auth, framework, configPath, path, pdpUrl, state]);

	const saveCodeToPath = useCallback(async () => {
		const { error } = await saveFile(path ?? '', code ?? '');
		if (error) {
			setError(error);
		}
		setState('done');
	}, [code, path]);

	useEffect(() => {
		if (code && path) {
			saveCodeToPath();
		} else if (code) {
			setState('done');
		}
	}, [code, path, saveCodeToPath]);

	return (
		<>
			{state === 'loading' && (
				<Text>
					Building <Spinner />
				</Text>
			)}
			{path && state === 'done' && <Text>Code Sample saved to {path}</Text>}
			{state === 'done' && !path && <Text>{code}</Text>}
			{error && <Text>{error}</Text>}
		</>
	);
}
