import React, { useEffect, useState } from 'react';
import { options } from '../../commands/init.js';
import { type infer as zInfer } from 'zod';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

import PolicyStepComponent from './PolicyStepComponent.js';
import DataSetupComponent from './DataSetupComponent.js';
import EnforceComponent from './EnforceComponent.js';

type Props = {
	options: zInfer<typeof options>;
};

export default function InitWizardComponent({ options }: Props) {
	const [overallStep, setOverallStep] = useState<
		| 'policy'
		| 'dataSetup'
		| 'enforce'
		| 'implement'
		| 'processing'
		| 'done'
		| 'error'
	>('policy');
	const [error, setError] = useState<string | null>(null);
	const [action, setAction] = useState<string | null>(null);
	const [resource, setResource] = useState<string | null>(null);
	const [user, setUser] = useState<{
		userId: string;
		firstName?: string;
		lastName?: string;
		email?: string;
	} | null>(null);

	useEffect(() => {
		if (overallStep === 'error') {
			setTimeout(() => {
				process.exit(1);
			}, 500);
		}
		if (overallStep === 'done') {
			setTimeout(() => {
				process.exit(0);
			}, 500);
		}
	}, [overallStep]);

	if (overallStep === 'policy') {
		return (
			<Box flexDirection={'column'}>
				<PolicyStepComponent
					onComplete={(action, resource) => {
						setAction(action);
						setResource(resource);
						setOverallStep('dataSetup');
					}}
					onError={error => {
						setError(error);
						setOverallStep('error');
					}}
				/>
			</Box>
		);
	}
	if (overallStep === 'dataSetup') {
		return (
			<Box flexDirection={'column'}>
				<DataSetupComponent
					apiKey={options.apiKey}
					onComplete={user => {
						setUser(user);
						setOverallStep('enforce');
					}}
					onError={error => {
						setError(error);
						setOverallStep('error');
					}}
				/>
			</Box>
		);
	}

	if (overallStep === 'enforce') {
		return (
			<Box flexDirection={'column'} marginY={1}>
				<EnforceComponent
					onComplete={() => {
						setOverallStep('implement');
					}}
					onError={error => {
						setError(error);
						setOverallStep('error');
					}}
				/>
			</Box>
		);
	}

	if (overallStep === 'processing') {
		return (
			<Box flexDirection={'column'}>
				<Text>
					Processing... <Spinner type="dots" />
				</Text>
			</Box>
		);
	}

	if (overallStep === 'error') {
		return (
			<Box flexDirection={'column'}>
				<Text color="red">Error: {error}</Text>
			</Box>
		);
	}

	return null;
}
