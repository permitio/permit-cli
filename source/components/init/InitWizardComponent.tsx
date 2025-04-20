import React, { useState } from 'react';
import { options } from '../../commands/init.js';
import { type infer as zInfer } from 'zod';
import SelectInput from 'ink-select-input';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

import PolicyStepComponent from './PolicyStepComponent.js';

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
	const [user, setUser] = useState<string | null>(null);

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
	return null;
}
