import { Permit } from 'permitio';
import React from 'react';

export const PermitSDK = (token: string) => {
	return React.useMemo(
		() =>
			new Permit({
				token,
				pdp: 'http://localhost:7766',
			}),
		[token],
	);
};
