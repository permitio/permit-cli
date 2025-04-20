import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';

import APISyncUserComponent from '../api/sync/APISyncUserComponent.js';
import GeneratedUsersComponent from './GenerateUsersComponent.js';

type Props = {
	apiKey?: string;
	onComplete: (user: string) => void;
	onError: (error: string) => void;
};
export default function DataSetupComponent({
	apiKey,
	onComplete,
	onError,
}: Props) {
	const [step, setStep] = useState<
		| 'Manual'
		| 'Generate'
		| 'done'
		| 'error'
		| 'initial'
		| 'processing'
		| 'askCount'
	>('initial');
	const [error, setError] = useState<string | null>(null);
	const [user, setUser] = useState<string | null>(null);
	const [userCount, setUserCount] = useState<number>(0);
	const [count, setCount] = useState<string>('0');
	const [currIndex, setCurrIndex] = useState<number>(0);

	useEffect(() => {
		if (error) {
			onError(error);
		}
		if (step === 'done') {
			onComplete(user || '');
		}
	}, [error, onError, step, onComplete, user]);

	if (step === 'initial') {
		return (
			<Box flexDirection="column">
				<Text>Data Setup: </Text>
				<SelectInput
					items={[
						{
							label: 'Interactively create users',
							value: 'Manual',
						},
						{
							label: 'Generate users',
							value: 'Generate',
						},
					]}
					onSelect={item => {
						if (item.value === 'Manual') {
							setStep('askCount');
						} else {
							setStep('Generate');
						}
					}}
				/>
			</Box>
		);
	}
	if (step === 'askCount') {
		return (
			<Box flexDirection={'column'}>
				<Text>How many users do you want to create: </Text>
				<Box marginY={1}>
					<TextInput
						value={count}
						onChange={setCount}
						onSubmit={() => {
							const parsedCount = parseInt(count);
							if (isNaN(parsedCount) || parsedCount <= 0) {
								setError('Invalid user count');
								setCount('0');
								setStep('error');
							} else {
								setUserCount(parsedCount);
								setStep('Manual');
							}
						}}
					/>
				</Box>
			</Box>
		);
	}

	if (step === 'Manual') {
		return (
			<Box flexDirection={'column'}>
				<Text> Creating User {currIndex + 1} : </Text>
				<APISyncUserComponent
					options={{ apiKey: apiKey }}
					onComplete={currentUser => {
						if (!user) {
							setUser(currentUser);
						}
						setCurrIndex(currIndex + 1);
						if (currIndex + 1 >= userCount) {
							setStep('done');
						}
					}}
					onError={error => {
						setError(error);
						setStep('error');
					}}
				/>
			</Box>
		);
	}

	if (step === 'Generate') {
		return (
			<Box flexDirection={'column'}>
				<Text>Generating Users...</Text>
				<GeneratedUsersComponent
					onComplete={currentUser => {
						setUser(currentUser);
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
			<Text>
				Processing... <Spinner type="dots" />
			</Text>
		);
	}
	return null;
}
