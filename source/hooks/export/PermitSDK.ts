import { Permit } from 'permitio';
import React from 'react';
import { getPermitApiUrl } from '../../config.js';

export const usePermitSDK = (
	token: string,
	pdpUrl: string = 'http://localhost:7766',
) => {
	return React.useMemo(
		() =>
			new Permit({
				token,
				pdp: pdpUrl,
				apiUrl: getPermitApiUrl(),
			}),
		[token, pdpUrl],
	);
};
