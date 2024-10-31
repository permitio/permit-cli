import React, { useState } from 'react';
import { Text, Box } from 'ink';
import GenerateKeyGen from '../../../lib/ssh-gen.js';
import { UncontrolledTextInput } from 'ink-text-input';

export default function Github() {
	const [email, setEmail] = useState('');
	const [key, setKey] = useState({ publicKey: '' });

	// To get Email
	const handleEmailSubmit = (query: string) => {
		setEmail(query);
		setKey(GenerateKeyGen(query));
	};

	return (
		<>
			<Text> Welcome to GitOps flow in GitHub</Text>
			{email === '' ? (
				<Box>
					<Box marginRight={1}>
						<Text>Enter your email:</Text>
					</Box>
					<UncontrolledTextInput onSubmit={handleEmailSubmit} />
				</Box>
			) : (
				<Text>
					SSH key will be generated for the email: {email} and ssh Key value is
					: {key.publicKey}
				</Text>
			)}
		</>
	);
}
