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

type CreatedUser = {
	userId: string;
	firstName?: string;
	lastName?: string;
	email?: string;
	roles?: string[];
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
		| 'userSummary'
	>('initial');
	const [error, setError] = useState<string | null>(null);
	const [user, setUser] = useState<CreatedUser | null>(null);
	const [userCount, setUserCount] = useState<number>(0);
	const [count, setCount] = useState<string>('');
	const [currIndex, setCurrIndex] = useState<number>(0);
	// Add a key to force component remount
	const [componentKey, setComponentKey] = useState<number>(0);
	const [users, setUsers] = useState<string[]>([]);
	// Track created users with more details for summary
	const [createdUsers, setCreatedUsers] = useState<CreatedUser[]>([]);

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
			roles?: string[];
		}) => {
			// Add user to our collections
			setUsers(prev => [...prev, currentUser.userId]);
			setCreatedUsers(prev => [...prev, currentUser]);

			// Save first user data for completion callback
			if (currIndex === 0) {
				setUser(currentUser);
			}

			// Check if we've created all users
			if (currIndex + 1 >= userCount) {
				// Show summary when all users are created
				setStep('userSummary');
			} else {
				// Increment the index for the next user
				setCurrIndex(prev => prev + 1);
				// Force component remount with a new key
				setComponentKey(prev => prev + 1);
			}
		},
		[currIndex, userCount],
	);

	// Handle completion and error states
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
	}, [error, onError, step, onComplete, user, users]);

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
								setCreatedUsers([]); // Reset created users
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

	if (step === 'userSummary') {
		return (
			<Box flexDirection="column">
				<Text color="green">
					Successfully created {createdUsers.length} users:
				</Text>

				<Box flexDirection="column" marginY={1}>
					{createdUsers.map((user, idx) => (
						<Box key={idx} marginLeft={1}>
							<Text>
								{idx + 1}. <Text bold>{user.userId}</Text>
								{user.firstName || user.lastName
									? ` (${[user.firstName, user.lastName].filter(Boolean).join(' ')})`
									: ''}
								{user.roles && user.roles.length > 0
									? ` - Role: ${user.roles.join(', ')}`
									: ''}
							</Text>
						</Box>
					))}
				</Box>

				<Box marginTop={1}>
					<SelectInput
						items={[
							{
								label: 'Continue',
								value: 'continue',
							},
						]}
						onSelect={() => setStep('done')}
					/>
				</Box>
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
