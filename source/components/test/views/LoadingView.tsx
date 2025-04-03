import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { ProcessPhase, ProgressState } from '../auditTypes.js';

interface LoadingViewProps {
	phase: ProcessPhase;
	progress: ProgressState;
}

const LoadingView: React.FC<LoadingViewProps> = ({ phase, progress }) => (
	<Box flexDirection="column">
		<Box>
			<Text>
				<Text color="green">
					<Spinner type="dots" />
				</Text>{' '}
				{phase === 'fetching' && 'Fetching audit logs...'}
				{phase === 'processing' &&
					`Processing audit logs (${progress.current}/${progress.total})...`}
				{phase === 'checking' &&
					`Checking against PDP (${progress.current}/${progress.total})...`}
			</Text>
		</Box>
	</Box>
);

export default LoadingView;
