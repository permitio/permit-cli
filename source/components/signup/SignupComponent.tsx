import React, { useState, FC, useEffect } from 'react';
import { TextInput, ConfirmInput } from '@inkjs/ui';
import { Text, Newline } from 'ink';
import Spinner from 'ink-spinner';
import randomName from '@scaleway/random-name';
import { useOrganisationApi } from '../../hooks/useOrganisationApi.js';
import { cleanKey } from '../../lib/env/copy/utils.js';

type SignupProp = {
	accessToken: string;
	cookie?: string | null;
	onSuccess: () => void;
};

const SignupComponent: FC<SignupProp> = ({
	accessToken,
	cookie,
	onSuccess,
}: SignupProp) => {
	const [organizationName, setOrganizationName] = useState(randomName());
	const [error, setError] = useState<string | null>(null);
	const [state, setState] = useState<
		'confirming' | 'selecting' | 'creating' | 'done'
	>('confirming');

	useEffect(() => {
		if (state === 'done') {
			onSuccess();
		}
		if (error) {
			setTimeout(() => {
				process.exit(1);
			}, 1000);
		}
	});

	const { createOrg } = useOrganisationApi();

	const handleWorkspaceCreation = async (workspace: string) => {
		const cleanOrgName = cleanKey(workspace);
		setOrganizationName(cleanOrgName);
		const { error } = await createOrg(
			{
				key: cleanOrgName,
				name: cleanOrgName,
			},
			accessToken,
			cookie,
		);
		if (error) {
			setError(error);
			return;
		}
		setState('done');
	};

	const handleConfirm = async () => {
		setState('creating');
		await handleWorkspaceCreation(organizationName);
	};

	const handleCancel = () => {
		setState('selecting');
	};

	return (
		<>
			<Text bold>Welcome! Create your Workspace</Text>
			{/*<Newline count={2} />*/}
			{state === 'confirming' && (
				<>
					<Text>
						Use the default organization name:{' '}
						<Text color="green">{organizationName}</Text>?{' '}
						<ConfirmInput onConfirm={handleConfirm} onCancel={handleCancel} />{' '}
					</Text>
				</>
			)}
			{state === 'selecting' && (
				<>
					<Text>
						Enter your organization name (Default:{' '}
						<Text color="green">{organizationName}</Text>):
					</Text>
					<TextInput
						placeholder="Type your organization name..."
						onSubmit={input => {
							setState('creating');
							handleWorkspaceCreation(input || organizationName);
						}}
					/>
				</>
			)}

			{state === 'creating' && (
				<>
					<Text>
						Creating your organization <Spinner />
					</Text>
				</>
			)}

			{state === 'done' && (
				<>
					<Text>
						Organization: {organizationName} created successfully & Signup
						successful
					</Text>
				</>
			)}
			{error && (
				<>
					<Newline />
					<Text color="red">{error}</Text>
				</>
			)}
		</>
	);
};

export default SignupComponent;
