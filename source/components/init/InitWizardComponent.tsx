import React, { useState } from 'react';
import { options } from '../../commands/init.js';
import { type infer as zInfer } from 'zod';
import SelectInput from 'ink-select-input';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

type Props = {
	options: zInfer<typeof options>;
};

export default function InitWizardComponent({ options }: Props) {
	const [overallStep, setOverallStep] = useState<
		| 'policy'
		| 'dataSetup'
		| 'enforce'
		| 'implement'
		| 'processing'
		| 'done'
		| 'error'
	>('policy');
}
