import pkg from 'keytar';
import {
	DEFAULT_PERMIT_KEYSTORE_ACCOUNT,
	KEYSTORE_PERMIT_SERVICE_NAME,
} from '../config/config.js';

const { setPassword, getPassword, deletePassword } = pkg;

export enum TokenType {
	APIToken = 'APIToken',
	AccessToken = 'AccessToken',
	Invalid = 'Invalid',
}

export const tokenType = (token: string): TokenType => {
	if (token.length >= 97 && token.startsWith('permit_key_')) {
		return TokenType.APIToken;
	}

	// TBD add a better JWT validation/verification
	if (token.split('.').length === 3) {
		return TokenType.AccessToken;
	}

	return TokenType.Invalid;
};

export const saveAuthToken = async (token: string): Promise<string> => {
	try {
		const t: TokenType = tokenType(token);
		if (t === TokenType.Invalid) {
			return 'Invalid auth token';
		}

		await setPassword(
			KEYSTORE_PERMIT_SERVICE_NAME,
			DEFAULT_PERMIT_KEYSTORE_ACCOUNT,
			token,
		);
		return '';
	} catch (error) {
		return error as string;
	}
};

export const loadAuthToken = async (): Promise<string> => {
	const token = await getPassword(
		KEYSTORE_PERMIT_SERVICE_NAME,
		DEFAULT_PERMIT_KEYSTORE_ACCOUNT,
	);
	if (!token) {
		throw new Error(
			'No token found, use `permit login` command to get an auth token',
		);
	}

	return token;
};

export const cleanAuthToken = async () => {
	await deletePassword(
		KEYSTORE_PERMIT_SERVICE_NAME,
		DEFAULT_PERMIT_KEYSTORE_ACCOUNT,
	);
};
