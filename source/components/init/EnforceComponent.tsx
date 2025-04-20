import React, { useEffect, useState } from 'react';
import SelectInput from 'ink-select-input';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';
import PDPRunComponent from '../pdp/PDPRunComponent.js';

type Props = {
	onComplete: () => void;
	onError: (error: string) => void;
};

export default function EnforceComponent({ onComplete, onError }: Props) {
	const [error, setError] = useState<string | null>(null);
	const [step, setStep] = useState<
		'initial' | 'done' | 'error' | 'run' | 'show' | 'processing'
	>('initial');
	useEffect(() => {
		if (error) {
			onError(error);
		}
		if (step === 'done') {
			onComplete();
		}
	}, [error, onError, step, onComplete]);

	if (step === 'initial') {
		return (
			<Box flexDirection="column">
				<Text>Enforce: </Text>
				<SelectInput
					items={[
						{
							label: 'Run PDP ',
							value: 'run',
						},
						{
							label: 'Show PDP command',
							value: 'show',
						},
					]}
					onSelect={item => {
						if (item.value === 'run') {
							setStep('run');
						} else if (item.value === 'show') {
							setStep('show');
						}
					}}
				/>
			</Box>
		);
	}

	if (step === 'run') {
		return (
			<Box flexDirection="column">
				<Text>Running PDP...</Text>
				<PDPRunComponent
					onComplete={() => {
						setStep('done');
					}}
					onError={error => {
						setError(error);
						setStep('error');
					}}
				/>
			</Box>
		);
	}
	if (step === 'show') {
		return (
			<Box flexDirection={'column'}>
				<PDPRunComponent
					dryRun={true}
					onComplete={() => {
						setStep('done');
					}}
					onError={error => {
						setError(error);
						setStep('error');
					}}
				/>
			</Box>
		);
	}
	if (step === 'processing') {
		return (
			<Box flexDirection="column">
				<Text>
					<Spinner type="dots" />
					Processing...
				</Text>
			</Box>
		);
	}
	return null;
}
