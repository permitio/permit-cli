import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

export const TFChatComponent = () => {
	const [input, setInput] = useState('');
	const [messages, setMessages] = useState<Array<{ role: string; content: string }>>(
		[],
	);
	const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
	const [currentResponse, setCurrentResponse] = useState('');

	const sendMessage = async (message: string) => {
		try {
			setIsWaitingForResponse(true);
			setMessages(prevMessages => [
				...prevMessages,
				{ role: 'user', content: message },
			]);

			const response = await fetch('http://localhost:3000/chat', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ message }),
			});

			if (!response.ok) {
				throw new Error('Network response was not ok');
			}

			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error('No reader available');
			}

			let accumulatedResponse = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const text = new TextDecoder().decode(value);
				const lines = text.split('\n');

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const data = JSON.parse(line.slice(6));
						if (data.delta) {
							accumulatedResponse += data.delta;
							setCurrentResponse(accumulatedResponse);
						}
					}
				}
			}

			setMessages(prevMessages => [
				...prevMessages,
				{ role: 'assistant', content: accumulatedResponse },
			]);
			setCurrentResponse('');
		} catch (error) {
			console.error('Error sending message:', error);
			setMessages(prevMessages => [
				...prevMessages,
				{
					role: 'assistant',
					content: 'Error: Unable to connect to the server',
				},
			]);
		} finally {
			setIsWaitingForResponse(false);
		}
	};

	const handleSubmit = (value: string) => {
		if (value.trim()) {
			sendMessage(value.trim());
			setInput('');
		}
	};

	return (
		<Box flexDirection="column">
			{messages.map((msg, i) => (
				<Text key={i} color={msg.role === 'user' ? 'blue' : 'green'}>
					{msg.role === 'user' ? 'You: ' : 'Assistant: '}
					{msg.content}
				</Text>
			))}
			{isWaitingForResponse && currentResponse && (
				<Text color="yellow">Assistant: {currentResponse}</Text>
			)}
			<TextInput
				value={input}
				onChange={setInput}
				onSubmit={handleSubmit}
				placeholder="Type your message..."
			/>
		</Box>
	);
};
