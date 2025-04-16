import React from 'react';
import { Text } from 'ink';
import { ComparisonResult } from '../auditTypes.js';

interface DifferenceResultViewProps {
	result: ComparisonResult;
}

const DifferenceResultView: React.FC<DifferenceResultViewProps> = ({
	result,
}) => (
	<>
		<Text>User: {result.auditLog.user_key || result.auditLog.user_id}</Text>
		<Text>
			Resource: {result.auditLog.resource} (type:{' '}
			{result.auditLog.resource_type})
		</Text>
		<Text>Action: {result.auditLog.action}</Text>
		<Text>Tenant: {result.auditLog.tenant}</Text>
		<Text>
			Original:{' '}
			<Text color={result.originalDecision ? 'green' : 'red'}>
				{result.originalDecision ? 'ALLOW' : 'DENY'}
			</Text>
			, New:{' '}
			<Text color={result.newDecision ? 'green' : 'red'}>
				{result.newDecision ? 'ALLOW' : 'DENY'}
			</Text>
		</Text>
	</>
);

export default DifferenceResultView;
