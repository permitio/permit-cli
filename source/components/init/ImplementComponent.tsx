import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import {
	getFormatedFile,
	installationCommand,
} from '../../utils/init/utils.js';
import { useAuth } from '../AuthProvider.js';
import Spinner from 'ink-spinner';

type Props = {
	action: string;
	resource: string;
	user?: {
		userId: string;
		firstName?: string;
		lastName?: string;
		email?: string;
	};
	apiKey?: string;
	onComplete: () => void;
	onError: (error: string) => void;
};

const getLanguageKey = (filename: string): string => {
	if (filename.endsWith('.js')) return 'node';
	if (filename.endsWith('.py')) return 'python';
	if (filename.endsWith('.rb')) return 'ruby';
	if (filename.endsWith('.java')) return 'java';
	if (filename.endsWith('.cs')) return 'dotnet';
	if (filename.endsWith('.go')) return 'go';
	return 'node'; // Default
};

export default function ImplementComponent({
	action,
	resource,
	user,
	apiKey,
	onComplete,
	onError,
}: Props) {
	const { authToken } = useAuth();
	const [language, setLanguage] = useState<string>('example.js');
	const [error, setError] = useState<string | null>(null);
	const [step, setStep] = useState<'initial' | 'done' | 'error' | 'processing'>(
		'initial',
	);
	const [implementCode, setImplementCode] = useState<string | null>(null);

	useEffect(() => {
		if (step === 'processing') {
			try {
				const fileName = language;
				const token = apiKey || authToken;
				if (!token) {
					throw new Error('No API key or auth token available');
				}

				const content = getFormatedFile(
					fileName,
					token,
					action,
					resource,
					user?.userId || 'user123',
					user?.email,
					user?.firstName,
					user?.lastName,
				);

				setImplementCode(content);
				setStep('done');
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : String(err);
				setError(errorMessage);
				setStep('error');
				onError(errorMessage);
			}
		}
	}, [step, language, apiKey, authToken, action, resource, user, onError]);

	if (step === 'initial') {
		return (
			<Box flexDirection="column">
				<Text>Implementation Example </Text>
				<Text>Select a Language</Text>
				<SelectInput
					items={[
						{
							label: 'Node.js',
							value: 'example.js',
						},
						{
							label: 'Python',
							value: 'example.py',
						},
						{
							label: 'Java',
							value: 'Example.java',
						},
						{
							label: 'Go',
							value: 'example.go',
						},
						{
							label: 'Ruby',
							value: 'example.rb',
						},
						{
							label: '.NET (C#)',
							value: 'Example.cs',
						},
					]}
					onSelect={item => {
						setLanguage(item.value);
						setStep('processing');
					}}
				/>
			</Box>
		);
	}

	if (step === 'processing') {
		return (
			<Box>
				<Text>
					<Spinner type="dots" /> Loading code sample...
				</Text>
			</Box>
		);
	}

	if (step === 'done' && implementCode) {
		const langKey = getLanguageKey(language);
		const installCmd =
			installationCommand[langKey as keyof typeof installationCommand] || '';

		return (
			<Box flexDirection="column">
				<Text bold>Implementation Example ({language}):</Text>
				<Box marginY={1}>
					<Text bold color="yellow">
						Installation:
					</Text>
					<Box borderStyle="round" padding={1}>
						<Text>{installCmd}</Text>
					</Box>
				</Box>

				{/* Code Sample Section */}
				<Box marginY={1}>
					<Text bold color="yellow">
						Code Sample:
					</Text>
					<Box borderStyle="round" padding={1}>
						<Text>{implementCode}</Text>
					</Box>
				</Box>

				<Box marginTop={1}>
					<SelectInput
						items={[{ label: 'Complete Setup', value: 'complete' }]}
						onSelect={() => {
							onComplete();
						}}
					/>
				</Box>
			</Box>
		);
	}

	if (step === 'error') {
		return (
			<Box flexDirection="column">
				<Text color="red">Error: {error}</Text>
			</Box>
		);
	}

	// Fallback
	return null;
}
