import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { getRepoList } from '../../lib/gitops/utils.js';
import Spinner from 'ink-spinner';

type Props = {
	accessToken: string;
	projectName: string;
	onRepoKeySubmit: (repoKey: string) => void;
	onError: (error: string) => void;
};

const RepositoryKey: React.FC<Props> = ({
	accessToken,
	projectName,
	onRepoKeySubmit,
	onError,
}) => {
	const [repoKey, setRepoKey] = useState<string>('');
	const [repolist, setRepoList] = useState<string[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [isFetched, setIsFetched] = useState<boolean>(false);
	const Validate = async (repoKey: string): Promise<string> => {
		if (repoKey.length <= 1) {
			return 'Repository Key is required';
		}
		const regex = /^[A-Za-z0-9\-_]+$/;
		if (!regex.test(repoKey)) {
			return 'Repository Key should contain only alphanumeric characters, hyphens and underscores';
		}
		return '';
	};

	const fetchRepoList = async () => {
		try {
			const repos = await getRepoList(accessToken, projectName);
			const tempRepoList = repos.map(repo => repo.key);
			setRepoList(tempRepoList);
			setIsFetched(true);
		} catch (error) {
			onError(error instanceof Error ? error.message : String(error));
		} finally {
			setLoading(false);
		}
	};

	if (!isFetched) {
		fetchRepoList();
	}
	const handleSubmit = useCallback(
		async (repoKey: string) => {
			const isRepositoryKeyAlreadyPresent = (repoKey: string): boolean => {
				if (repolist.includes(repoKey)) {
					onError('RepositoryKey with this name already exists');
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
						<Text> Enter Your RepositoryKey : </Text>
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
