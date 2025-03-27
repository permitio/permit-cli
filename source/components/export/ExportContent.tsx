import React from 'react';
import { useEffect, useState, FC, useRef } from 'react';
import { useApiKeyApi } from '../../hooks/useApiKeyApi.js';
import { useAuth } from '../../components/AuthProvider.js';
import { ExportOptions } from '../../commands/env/export/types.js';
import { ExportStatus } from './ExportStatus.js';
import { useExport } from '../../hooks/export/useExport.js';
import fs from 'node:fs/promises';
import { Text } from 'ink';

export const ExportContent: FC<{ options: ExportOptions }> = ({
	options: { key: apiKey, file, includeDefaultRoles },
}) => {
	const { validateApiKeyScope } = useApiKeyApi();
	const { authToken } = useAuth();
	const key = apiKey || authToken;
	const { state, setState, exportConfig } = useExport({
		apiKey: key,
		includeDefaultRoles,
	});
	const [hclOutput, setHclOutput] = useState<string | null>(null);
	const hasRunRef = useRef(false);

	useEffect(() => {
		// Use a ref to ensure this only runs once, regardless of dependency changes
		if (hasRunRef.current) return;
		hasRunRef.current = true;

		let isSubscribed = true;

		// Define an async function for the export process
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

				// Validate the API key scope
				const validationResult = await validateApiKeyScope(key, 'environment');
				const { valid, error: scopeError, scope } = validationResult;

				if (!valid || scopeError || !scope) {
					setState({
						status: '',
						error: `Invalid API key: ${scopeError || 'No scope found'}`,
						isComplete: true,
						warnings: [],
					});
					return;
				}

				// If component has been unmounted, don't proceed
				if (!isSubscribed) return;

				// Normalize the environment_id and project_id to match ExportScope
				const normalizedScope = {
					...scope,
					environment_id: scope.environment_id || undefined,
					project_id: scope.project_id || undefined,
				};

				setState(prev => ({
					...prev,
					status: 'Initializing export...',
				}));

				// Run the export
				const { hcl, warnings } = await exportConfig(normalizedScope);

				// If component has been unmounted, don't proceed
				if (!isSubscribed) return;

				// Handle file saving if needed
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
					setHclOutput(hcl); // Store HCL output in state
				}

				// If component has been unmounted, don't proceed
				if (!isSubscribed) return;

				// Complete the process
				setState({
					status: '',
					error: null,
					isComplete: true,
					warnings,
				});
			} catch (err) {
				// If component has been unmounted, don't proceed
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

		// Execute the export process
		runExport();

		// Return cleanup function
		return () => {
			isSubscribed = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Empty dependency array with eslint disable comment

	return (
		<>
			<ExportStatus state={state} file={file} />
			{!file && hclOutput && (
				<Text>
					<Text>{hclOutput}</Text>
				</Text>
			)}
			{state.error && <Text color="red">{state.error}</Text>}
		</>
	);
};
