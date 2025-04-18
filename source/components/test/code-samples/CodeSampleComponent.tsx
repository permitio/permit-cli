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

type CodeSampleProps = {
	codeSample: 'jest' | 'pytest' | 'vitest';
	configPath?: string;
	path?: string;
	pdpPath?: string;
};

export function CodeSampleComponent({
	codeSample,
	configPath,
	path,
	pdpPath,
}: CodeSampleProps) {
	const [code, setCode] = useState<string | undefined>(undefined);
	const [state, setState] = useState<'loading' | 'done'>('loading');
	const [error, setError] = useState<string | undefined>(undefined);
	const auth = useAuth();

	useEffect(() => {
		if (error) {
			process.exit(1);
		}
	}, [error]);

	useEffect(() => {
		if (auth.loading && state !== 'loading') return;
		if (codeSample === 'jest') {
			setCode(generateJestSample(pdpPath, configPath, auth.authToken));
		} else if (codeSample === 'pytest') {
			setCode(generatePytestSample(pdpPath, configPath, auth.authToken));
		} else if (codeSample === 'vitest') {
			setCode(generateVitestSample(pdpPath, configPath, auth.authToken));
		}
		if (!path) {
			setState('done');
		}
	}, [auth, codeSample, configPath, path, pdpPath, state]);

	const saveCodeTOPath = useCallback(async () => {
		const { error } = await saveFile(path ?? '', code ?? '');
		if (error) {
			setError(error);
		}
		setState('done');
	}, [code, path]);

	useEffect(() => {
		if (code) {
			saveCodeTOPath();
		}
	}, [code, saveCodeTOPath]);

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
