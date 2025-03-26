import React from 'react';
import { options } from '../../../commands/api/sync/users.js';
import { type infer as zType } from 'zod';

type Props = {
	options: zType<typeof options>;
};

export default function APISyncUserComponent({ options }: Props) {
	return <></>;
}
