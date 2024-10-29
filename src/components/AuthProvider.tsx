import React, {
	createContext,
	ReactNode,
	useContext,
	useEffect,
	useState,
} from 'react';
import { Text } from 'ink';
import { loadAuthToken } from '../lib/auth.js';

// Define the AuthContext type
type AuthContextType = {
	authToken: string;
	loading: boolean;
	error: string;
};

// Create an AuthContext with the correct type
const AuthContext = createContext<AuthContextType | undefined>(undefined);

const useProvideAuth = () => {
	const [authToken, setAuthToken] = useState('');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const fetchAuthToken = async () => {
		try {
			const token = await loadAuthToken();
			setAuthToken(token);
		} catch (error) {
			setError(error instanceof Error ? error.message : String(error));
		}

		setLoading(false);
	};

	useEffect(() => {
		fetchAuthToken();
	}, []);

	return {
		authToken,
		loading,
		error,
	};
};

export function AuthProvider({ children }: { readonly children: ReactNode }) {
	const auth = useProvideAuth();
	return (
		<AuthContext.Provider value={auth}>
			{auth.loading && !auth.error && <Text>Loading Token</Text>}
			{!auth.loading && auth.error && <Text>{auth.error.toString()}</Text>}
			{!auth.loading && !auth.error && children}
		</AuthContext.Provider>
	);
}

// Custom hook to access the AuthContext
export const useAuth = (): AuthContextType => {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider');
	}

	return context;
};
