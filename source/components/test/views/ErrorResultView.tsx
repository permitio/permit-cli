import React from 'react';
import { Text } from 'ink';
import { ComparisonResult } from '../auditTypes.js';

interface ErrorResultViewProps {
	result: ComparisonResult;
}

const ErrorResultView: React.FC<ErrorResultViewProps> = ({ result }) => (
	<>
		<Text>User: {result.auditLog.user_key}</Text>
		<Text>
			Resource: {result.auditLog.resource} (type:{' '}
			{result.auditLog.resource_type})
		</Text>
		<Text>Action: {result.auditLog.action}</Text>
		<Text>Tenant: {result.auditLog.tenant}</Text>
		<Text color="yellow">Error: {result.error}</Text>
	</>
);

export default ErrorResultView;
