import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { getRepoList } from '../../lib/gitops/utils.js';
import Spinner from 'ink-spinner';
import { getNamespaceIl18n } from '../../lib/i18n.js';
const i18n = getNamespaceIl18n('gitops.create.github');

type Props = {
	apiKey: string;
	projectName: string;
	onRepoKeySubmit: (repoKey: string) => void;
	onError: (error: string) => void;
};

const RepositoryKey: React.FC<Props> = ({
	apiKey,
	projectName,
	onRepoKeySubmit,
	onError,
}) => {
	const [repoKey, setRepoKey] = useState<string>('');
	const [repolist, setRepoList] = useState<string[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const Validate = async (repoKey: string): Promise<string> => {
		if (repoKey.length <= 1) {
			return i18n('missingRepoKey.error');
		}
		const regex = /^[A-Za-z0-9\-_]+$/;
		if (!regex.test(repoKey)) {
			return i18n('invalidRepoKey.error');
		}
		return '';
	};

	const fetchRepoList = useCallback(async () => {
		try {
			const repos = await getRepoList(apiKey, projectName);
			const tempRepoList = repos.map(repo => repo.key);
			setRepoList(tempRepoList);
		} catch (error) {
			onError(error instanceof Error ? error.message : String(error));
		} finally {
			setLoading(false);
		}
	}, [setRepoList, setLoading, onError, apiKey, projectName]);

	useEffect(() => {
		fetchRepoList();
	}, [fetchRepoList]);
	const handleSubmit = useCallback(
		async (repoKey: string) => {
			const isRepositoryKeyAlreadyPresent = (repoKey: string): boolean => {
				if (repolist.includes(repoKey)) {
					onError(i18n('duplicateRepoKey.error'));
					return true;
				}
				return false;
			};
			if (isRepositoryKeyAlreadyPresent(repoKey)) return;
			try {
				const error = await Validate(repoKey);
				if (error.length > 1) {
					onError(error);
					return;
				}
			} catch (error) {
				onError(error instanceof Error ? error.message : String(error));
			}
			onRepoKeySubmit(repoKey);
		},
		[onError, onRepoKeySubmit, repolist],
	);

	return (
		<>
			{loading ? (
				<Spinner type="dots" />
			) : (
				<Box>
					<Box marginRight={1}>
						<Text>{i18n('enterRepoKey.message')}</Text>
						<TextInput
							value={repoKey}
							onChange={setRepoKey}
							onSubmit={handleSubmit}
						/>
					</Box>
				</Box>
			)}
		</>
	);
};

export default RepositoryKey;
