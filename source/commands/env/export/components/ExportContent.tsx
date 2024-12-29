import React from 'react';
import { useApiKeyApi } from '../../../../hooks/useApiKeyApi.js';
import { useAuth } from '../../../../components/AuthProvider.js';
import { ExportOptions } from '../types.js';
import { ExportStatus } from './ExportStatus.js';
import { useExport } from './hooks/useExport.js';
import fs from 'node:fs/promises';

export const ExportContent: React.FC<{ options: ExportOptions }> = ({
	options: { key: apiKey, file },
}) => {
	const { validateApiKeyScope } = useApiKeyApi();
	const { authToken } = useAuth();
	const key = apiKey || authToken;
	const { state, setState, exportConfig } = useExport(key);

	React.useEffect(() => {
		let isSubscribed = true;

		const runExport = async () => {
			if (!key) {
				setState({
					status: '',
					error: 'No API key provided. Please provide a key or login first.',
					isComplete: true,
					warnings: [],
				});
				return;
			}

			try {
				setState(prev => ({ ...prev, status: 'Validating API key...' }));
				const {
					valid,
					error: scopeError,
					scope,
				} = await validateApiKeyScope(key, 'environment');

				if (!valid || scopeError || !scope) {
					setState({
						status: '',
						error: `Invalid API key: ${scopeError || 'No scope found'}`,
						isComplete: true,
						warnings: [],
					});
					return;
				}

				// Normalize the environment_id and project_id to match ExportScope
				const normalizedScope = {
					...scope,
					environment_id: scope.environment_id || undefined,
					project_id: scope.project_id || undefined,
				};

				if (!isSubscribed) return;

				setState(prev => ({
					...prev,
					status: 'Initializing export...',
				}));

				const { hcl, warnings } = await exportConfig(normalizedScope);

				if (!isSubscribed) return;

				if (file) {
					setState(prev => ({ ...prev, status: 'Saving to file...' }));
					try {
						await fs.writeFile(file, hcl);
					} catch (error) {
						const errorMessage =
							error instanceof Error ? error.message : String(error);
						setState({
							status: '',
							error: `Failed to export configuration: ${errorMessage}`,
							isComplete: true,
							warnings: [],
						});
						return;
					}
				} else {
					console.log(hcl);
				}

				if (!isSubscribed) return;

				setState({
					status: '',
					error: null,
					isComplete: true,
					warnings,
				});
			} catch (err) {
				if (!isSubscribed) return;
				const errorMsg = err instanceof Error ? err.message : String(err);
				setState({
					status: '',
					error: `Failed to export configuration: ${errorMsg}`,
					isComplete: true,
					warnings: [],
				});
			}
		};

		runExport();

		return () => {
			isSubscribed = false;
		};
	}, [key, file, validateApiKeyScope]);

	return <ExportStatus state={state} file={file} />;
};
