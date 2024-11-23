import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { getRepoList } from '../../lib/gitops/utils.js';

type Props = {
	accessToken: string;
	projectName: string;
	onPolicyNameSubmit: (policyName: string) => void;
	onError: (error: string) => void;
};

const PolicyName: React.FC<Props> = ({
	accessToken,
	projectName,
	onPolicyNameSubmit,
	onError,
}) => {
	const Validate = async (policyName: string): Promise<string> => {
		if (policyName.length <= 1) {
			return 'Policy Name is required';
		}
		const regex = /^[A-Za-z0-9\-_]+$/;
		if (!regex.test(policyName)) {
			return 'Policy Name should contain only alphanumeric characters, hyphens and underscores';
		}
		return '';
	};
	const [policyName, setPolicyName] = useState<string>('');
	const [repolist, setRepoList] = useState<string[]>([]);
	useEffect(() => {
		getRepoList(accessToken, projectName).then(repos => {
			let tempRepoList: string[] = [];
			repos.forEach(repo => {
				tempRepoList.push(repo.key);
			});
			setRepoList(tempRepoList);
		});
	}, []);

	const handleSubmit = (policyName: string) => {
		isPolicyAlreadyPresent(policyName);
		Validate(policyName).then(error => {
			if (error.length > 1) {
				onError(error);
				return;
			}
		});
		onPolicyNameSubmit(policyName);
	};

	const isPolicyAlreadyPresent = (policyName: string) => {
		console.log(repolist)
		if (repolist.length > 0) {
			if (repolist.includes(policyName)) {
				onError('Policy with this name already exists');
				return ;
			}
		}
	};

	return (
		<>
			<Box>
				<Box marginRight={1}>
					<Text color={'blue'}> Enter Your Policy Name: </Text>
					<TextInput
						value={policyName}
						onChange={setPolicyName}
						onSubmit={handleSubmit}
					/>
				</Box>
			</Box>
		
		</>
	);
};

export default PolicyName;
