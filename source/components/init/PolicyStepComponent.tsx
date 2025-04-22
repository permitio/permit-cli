import React, { useEffect, useState } from 'react';
import SelectInput from 'ink-select-input';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

import SimplePolicyCreation from '../policy/CreateSimpleWizard.js';
import TemplatePolicyCreation from '../env/template/ApplyComponent.js';

type Props = {
	onComplete: (action: string, resource: string) => void;
	onError: (error: string) => void;
};

export default function PolicyStepComponent({ onComplete, onError }: Props) {
	const [step, setStep] = useState<
		'template' | 'simple' | 'processing' | 'done' | 'error' | 'initial'
	>('initial');
	const [error, setError] = useState<string | null>(null);
	const [action, setAction] = useState<string | null>(null);
	const [resource, setResource] = useState<string | null>(null);

	useEffect(() => {
		if (error) {
			onError(error);
		}
	}, [error, onError]);

	useEffect(() => {
		if (step === 'done') {
			onComplete(action || '', resource || '');
		}
	}, [step, onComplete, action, resource]);

	if (step === 'initial') {
		return (
			<Box flexDirection="column">
				<Text>Policy Setup: </Text>
				<SelectInput
					items={[
						{ label: 'Create a simple policy', value: 'simple' },
						{ label: 'Use a template', value: 'template' },
					]}
					onSelect={item => {
						if (item.value === 'simple') {
							setStep('simple');
						} else {
							setStep('template');
						}
					}}
				/>
			</Box>
		);
	}

	if (step === 'simple') {
		return (
			<SimplePolicyCreation
				onComplete={(resource, action) => {
					setResource(resource);
					setAction(action);
					setStep('done');
				}}
				onError={error => {
					setError(error);
					setStep('error');
				}}
			/>
		);
	}
	if (step === 'template') {
		return (
			<TemplatePolicyCreation
				onComplete={(resource, action) => {
					setResource(resource);
					setAction(action);
					setStep('done');
				}}
				onError={error => {
					setError(error);
					setStep('error');
				}}
			/>
		);
	}
	if (step === 'processing') {
		return (
			<Box flexDirection="column">
				<Text>
					<Spinner type="dots" /> Processing...
				</Text>
			</Box>
		);
	}
	return null;
}
