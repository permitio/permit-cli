import React, { useEffect, useState } from 'react';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { loadAuthToken } from '../../lib/auth.js';
import { API_PDPS_CONFIG_URL } from '../../config.js';
import { useAuth } from '../AuthProvider.js';

const execAsync = promisify(exec);

type Props = {
	opa?: number;
	dryRun?: boolean;
	onComplete?: () => void;
	onError?: (error: string) => void;
};

export default function PDPRunComponent({
	opa,
	dryRun = false,
	onComplete,
	onError,
}: Props) {
	const { authToken } = useAuth();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [dockerCommand, setDockerCommand] = useState<string>('');
	const [containerInfo, setContainerInfo] = useState<{
		id: string;
		name: string;
	} | null>(null);
	const [dockerAvailable, setDockerAvailable] = useState(true);

	useEffect(() => {
		const generateDockerCommand = async () => {
			try {
				setLoading(true);

				// Use the token from AuthProvider, or load from storage if needed
				const token = authToken || (await loadAuthToken());

				if (!token) {
					throw new Error(
						'No authentication token available. Please login first with `permit login`',
					);
				}

				// Fetch PDP configuration
				const response = await fetch(API_PDPS_CONFIG_URL, {
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
				});

				if (!response.ok) {
					throw new Error(
						`Failed to fetch PDP configuration: ${response.statusText}`,
					);
				}

				const config = await response.json();

				// Generate the Docker command
				const cmd = `docker run -d -p 7766:7000 ${
					opa ? `-p ${opa}:8181` : ''
				} -e PDP_API_KEY=${token} -e PDP_CONTROL_PLANE=${config.controlPlane || 'https://api.permit.io'} permitio/pdp-v2:latest`;

				setDockerCommand(cmd);

				if (!dryRun) {
					// Check if Docker is installed
					try {
						await execAsync('docker --version');
						setDockerAvailable(true);
					} catch {
						// Not using the error value, using underscore to indicate intentionally unused
						setDockerAvailable(false);
						throw new Error(
							'Docker is not installed or not in PATH. Please install Docker to run the PDP container.',
						);
					}

					// Run the Docker command
					if (dockerAvailable) {
						try {
							// Execute docker command with -d flag to run in detached mode
							const { stdout } = await execAsync(cmd);

							// Get container ID (it's returned by the command when using -d)
							const containerId = stdout.trim();

							// Get container name - using double quotes to avoid lint issue with single quotes
							const { stdout: nameOutput } = await execAsync(
								`docker inspect --format="{{.Name}}" ${containerId}`,
							);
							const containerName = nameOutput.trim().replace(/^\//, ''); // Remove leading / from name

							setContainerInfo({ id: containerId, name: containerName });

							// Call onComplete prop when everything is successful
							if (onComplete) {
								onComplete();
							}
						} catch (err) {
							const errorMessage =
								err instanceof Error ? err.message : String(err);
							throw new Error(`Failed to run Docker command: ${errorMessage}`);
						}
					}
				} else {
					// For dry run, we also call onComplete since we successfully generated the command
					if (onComplete) {
						onComplete();
					}
				}
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : String(err);
				setError(errorMessage);

				// Call onError prop when an error occurs
				if (onError) {
					onError(errorMessage);
				}
			} finally {
				setLoading(false);
			}
		};

		generateDockerCommand();
	}, [opa, dryRun, authToken, dockerAvailable, onComplete, onError]);

	if (loading) {
		return (
			<Box>
				<Text>
					<Spinner type="dots" />{' '}
					{dryRun
						? 'Generating Docker command...'
						: 'Starting PDP Docker container...'}
				</Text>
			</Box>
		);
	}

	if (error) {
		// If Docker isn't available, still show the command
		if (!dockerAvailable || error.includes('Docker is not installed')) {
			return (
				<Box flexDirection="column">
					<Text color="yellow">
						Docker is not available. Here&apos;s the command you can run
						manually:
					</Text>
					<Text>{dockerCommand}</Text>
					<Text color="red">Error: {error}</Text>
				</Box>
			);
		}

		return (
			<Box flexDirection="column">
				<Text color="red">Error: {error}</Text>
				<Text>You can try running the command manually:</Text>
				<Text>{dockerCommand}</Text>
			</Box>
		);
	}

	if (dryRun) {
		return (
			<Box flexDirection="column">
				<Text>Run the following command to start the PDP container:</Text>
				<Text>{dockerCommand}</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Text color="green">PDP container started successfully!</Text>
			<Text>
				Container ID: <Text color="cyan">{containerInfo?.id}</Text>
			</Text>
			<Text>
				Container Name: <Text color="cyan">{containerInfo?.name}</Text>
			</Text>
			<Text>
				The PDP is running on port 7676
				{opa ? ` with OPA exposed on port ${opa}` : ''}
			</Text>
			<Text>
				To stop the container, run:{' '}
				<Text color="yellow">docker kill {containerInfo?.id}</Text>
			</Text>
		</Box>
	);
}
