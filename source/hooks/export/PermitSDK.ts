import { Permit } from 'permitio';
import React from 'react';

export const usePermitSDK = (
	token: string,
	pdpUrl: string = 'http://localhost:7766',
) => {
	return React.useMemo(
		() =>
			new Permit({
				token,
				pdp: pdpUrl,
			}),
		[token, pdpUrl],
	);
};
