import React, { useEffect, useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';

import APISyncUserComponent from '../api/sync/APISyncUserComponent.js';
import GeneratedUsersComponent from './GenerateUsersComponent.js';

type Props = {
	apiKey?: string;
	onComplete: ({
		userId,
		firstName,
		lastName,
		email,
	}: {
		userId: string;
		firstName?: string;
		lastName?: string;
		email?: string;
		users: string[];
	}) => void;
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
	const [user, setUser] = useState<{
		userId: string;
		firstName?: string;
		lastName?: string;
		email?: string;
	} | null>(null);
	const [userCount, setUserCount] = useState<number>(0);
	const [count, setCount] = useState<string>('');
	const [currIndex, setCurrIndex] = useState<number>(0);
	// Add a key to force component remount
	const [componentKey, setComponentKey] = useState<number>(0);
	const [users, setUsers] = useState<string[]>([]);

	const handleGenerateComplete = useCallback(
		(currentUser: {
			userId: string;
			firstName?: string;
			lastName?: string;
			email?: string;
			users: string[];
		}) => {
			setUsers(prev => [...prev, ...currentUser.users]);
			setUser(currentUser);
			setStep('done');
		},
		[],
	);

	const handleError = useCallback((errorMsg: string) => {
		setError(errorMsg);
		setStep('error');
	}, []);

	const handleManualComplete = useCallback(
		(currentUser: {
			userId: string;
			firstName?: string;
			lastName?: string;
			email?: string;
		}) => {
			setUsers(prev => [...prev, currentUser.userId]);
			if (currIndex === 0) {
				setUser(currentUser);
			}

			// Check if we've created all users
			if (currIndex + 1 >= userCount) {
				setStep('done');
			} else {
				// Increment the index for the next user
				setCurrIndex(prev => prev + 1);
				// Force component remount with a new key
				setComponentKey(prev => prev + 1);
			}
		},
		[currIndex, userCount],
	);

	useEffect(() => {
		if (error) {
			onError(error);
		}
		if (step === 'done' && user) {
			onComplete({
				userId: user.userId,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				users: users,
			});
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
								setCurrIndex(0);
								setUserCount(parsedCount);

								setComponentKey(0); // Reset component key
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
				<Text>
					Creating User {currIndex + 1} of {userCount}:{' '}
				</Text>

				<APISyncUserComponent
					key={`user-${componentKey}`}
					options={{ apiKey: apiKey }}
					onComplete={handleManualComplete}
					onError={handleError}
				/>
			</Box>
		);
	}

	if (step === 'Generate') {
		return (
			<Box flexDirection={'column'}>
				<GeneratedUsersComponent
					onComplete={handleGenerateComplete}
					onError={handleError}
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

	if (step === 'error') {
		return (
			<Box flexDirection="column">
				<Text color="red">Error: {error}</Text>
			</Box>
		);
	}

	return null;
}
