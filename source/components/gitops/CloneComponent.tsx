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
	| { status: 'success'; output: string; command: string };

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
				const policyRepo = await fetchActivePolicyRepo();
				if (!policyRepo) {
					setState({ status: 'no_repo' });
					return;
				}
				if (project) {
					const command = `git clone ${policyRepo}`;
					if (dryRun) {
						setState({ status: 'success', output: command, command });
						return;
					}
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
		dryRun,
	]);

	const handleEnvironmentSelect = ({ value }: { value: string }) => {
		if (state.status !== 'select_environment') return;
		const command = `git clone --single-branch --branch permit/generated/${value} ${state.repourl}`;
		if (dryRun) {
			setState({ status: 'success', output: command, command });
			return;
		}
		setState({ status: 'ready_to_clone', command });
	};
	useEffect(() => {
		if (state.status === 'ready_to_clone' && !dryRun) {
			const executeCommand = async () => {
				try {
					setState({ status: 'cloning' });
					// Set a timeout of 300000 ms (5 minutes)
					const { stdout, stderr } = await exec(state.command);
					setState({
						status: 'success',
						output: `${stdout}\n${stderr}`,
						command: state.command,
					});
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
	useEffect(() => {
		if (
			state.status === 'success' ||
			state.status === 'error' ||
			state.status === 'no_repo'
		) {
			process.exit(state.status === 'success' ? 0 : 1);
		}
	}, [state]);

	return (
		<>
			{state.status === 'loading' && (
				<Box>
					<Spinner type="dots" />
					<Text>Checking for active Git repository....</Text>
				</Box>
			)}
			{state.status === 'no_repo' && (
				<Text color="red">No active Git repository found for the project. Run `permit gitops create github` to setup GitOps on your project.</Text>
			)}
			{state.status === 'error' && <Text color="red">{state.message}</Text>}
			{state.status === 'select_environment' && (
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
			)}
			{state.status === 'ready_to_clone' && (
				<Box flexDirection="column">
					<Text>Executing....</Text>
				</Box>
			)}
			{state.status === 'cloning' && (
				<Box>
					<Spinner type="dots" />
					<Text>Cloning the Environment...</Text>
				</Box>
			)}
			{state.status === 'success' &&
				(dryRun ? (
					<Box flexDirection={'column'}>
						<Text>Command to execute: </Text>
						<Text>{state.command}</Text>
					</Box>
				) : (
					<Box>
						<Text>SucessFully cloned the repository</Text>
					</Box>
				))}
		</>
	);
}
