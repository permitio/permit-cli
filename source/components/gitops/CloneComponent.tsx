import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { useEnvironmentApi } from '../../hooks/useEnvironmentApi.js';
import SelectInput from 'ink-select-input';
import useExecCommand from '../../hooks/useExecCommand.js';
import useGitOpsCloneApi from '../../hooks/useGitopsCloneApi.js';
import { useAuth } from '../AuthProvider.js';

type Environment = {
	id: string;
	name: string;
	key: string;
};

type CloneState =
	| { status: 'loading' }
	| { status: 'no_repo' }
	| { status: 'error'; message: string }
	| {
			status: 'select_environment';
			repourl: string;
			environments: Environment[];
	  }
	| { status: 'ready_to_clone'; command: string }
	| { status: 'cloning' }
	| { status: 'success'; output: string };

type Props = {
	apiKey?: string;
	dryRun?: boolean;
	project?: boolean;
};

export default function CloneComponent({ apiKey, dryRun, project }: Props) {
	const { scope } = useAuth();
	const [state, setState] = useState<CloneState>({ status: 'loading' });
	const { fetchActivePolicyRepo } = useGitOpsCloneApi();
	const { getEnvironments } = useEnvironmentApi();
	const { exec, error: execError } = useExecCommand();

	useEffect(() => {
		const checkGitOpsRepo = async () => {
			try {
				const policyRepo = await fetchActivePolicyRepo(
					scope.project_id as string,
					apiKey,
				);
				if (!policyRepo) {
					setState({ status: 'no_repo' });
					return;
				}
				if (project) {
					const command = `git clone ${policyRepo}`;
					setState({ status: 'ready_to_clone', command });
					return;
				}
				const { data, error } = await getEnvironments(
					scope.project_id as string,
					apiKey,
				);
				if (error || !data || data.length === 0) {
					setState({
						status: 'error',
						message: error
							? `Failed To fetch Environments: ${error}`
							: 'No Environments found in this project',
					});
					return;
				}

				const environments = data.map(env => ({
					id: env.id,
					name: env.name,
					key: env.key,
				}));
				setState({
					status: 'select_environment',
					repourl: policyRepo,
					environments,
				});
			} catch (err) {
				setState({
					status: 'error',
					message: err instanceof Error ? err.message : String(err),
				});
			}
		};
		checkGitOpsRepo();
	}, [
		fetchActivePolicyRepo,
		getEnvironments,
		scope.project_id,
		apiKey,
		project,
	]);

	const handleEnvironmentSelect = ({ value }: { value: string }) => {
		if (state.status !== 'select_environment') return;
		const command = `git clone --single-branch --branch permit/generated/${value} ${state.repourl}`;
		setState({ status: 'ready_to_clone', command });
	};
	useEffect(() => {
		if (state.status === 'ready_to_clone' && !dryRun) {
			const executeCommand = async () => {
				try {
					setState({ status: 'cloning' });
					const output = await exec(state.command);
					setState({ status: 'success', output });
				} catch (err) {
					setState({
						status: 'error',
						message:
							err instanceof Error
								? err.message
								: `Failed to execute git clone: ${execError || String(err)}`,
					});
				}
			};
			executeCommand();
		}
	}, [state, exec, dryRun, execError]);
	switch (state.status) {
		case 'loading':
			return (
				<Box>
					<Spinner type="dots" />
					<Text>Checking for active Gitops repository....</Text>
				</Box>
			);
		case 'no_repo':
			return <Text color="red">No active Gitops repository found</Text>;
		case 'error':
			return <Text color="red">{state.message}</Text>;
		case 'select_environment':
			return (
				<Box flexDirection="column">
					<Text>Select the Environment to clone</Text>
					<SelectInput
						items={state.environments.map(env => ({
							label: env.name,
							value: env.id,
						}))}
						onSelect={handleEnvironmentSelect}
					/>
				</Box>
			);
		case 'ready_to_clone':
			if (dryRun) {
				return (
					<Box flexDirection="column">
						<Text>The following command should be executed:</Text>
						<Text color="green">{state.command}</Text>
					</Box>
				);
			}
			return (
				<Box flexDirection="column">
					<Text>Executing....</Text>
				</Box>
			);
		case 'cloning':
			return (
				<Box>
					<Spinner type="dots" />
					<Text>Cloning the Environment...</Text>
				</Box>
			);
		case 'success':
			return (
				<Box>
					<Text>SucessFully cloned the repository</Text>
					<Text>{state.output}</Text>
				</Box>
			);
	}
}
