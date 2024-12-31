import React, {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from 'react';
import { Text } from 'ink';
import { loadAuthToken } from '../lib/auth.js';
import Login from '../commands/login.js';
import { ApiKeyScope, useApiKeyApi } from '../hooks/useApiKeyApi.js';
import { ActiveState } from './EnvironmentSelection.js';
import LoginFlow from './LoginFlow.js';
import SelectOrganization from './SelectOrganization.js';
import SelectProject from './SelectProject.js';

// Define the AuthContext type
type AuthContextType = {
	authToken: string;
	loading: boolean;
	error?: string | null;
	scope: ApiKeyScope;
};

// Create an AuthContext with the correct type
const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthProviderProps = {
	readonly children: ReactNode;
	permit_key?: string | null;
	scope?: 'organization' | 'project' | 'environment';
	keyAccount?: string | null;
};

export function AuthProvider({
	children,
	permit_key: key,
	scope,
	keyAccount,
}: AuthProviderProps) {
	const { validateApiKeyScope, getApiKeyList, getApiKeyById, getApiKeyScope } =
		useApiKeyApi();

	const [internalAuthToken, setInternalAuthToken] = useState<string | null>(
		null,
	);
	const [authToken, setAuthToken] = useState<string>('');
	const [cookie, setCookie] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [state, setState] = useState<
		'loading' | 'validate' | 'organization' | 'project' | 'login' | 'done'
	>('loading');
	const [organization, setOrganization] = useState<string | null>(null);
	const [project, setProject] = useState<string | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [currentScope, setCurrentScope] = useState<ApiKeyScope | null>(null);

	useEffect(() => {
		if (error) {
			process.exit(1);
		}
	}, [error]);

	useEffect(() => {
		if (authToken.length !== 0 && currentScope) {
			setLoading(false);
			setState('done');
		}
	}, [authToken, currentScope]);

	useEffect(() => {
		const fetchAuthToken = async (
			redirect_scope: 'organization' | 'project' | 'login',
		) => {
			try {
				const token = await loadAuthToken(keyAccount);
				const { response, error } = await getApiKeyScope(token);
				if (error) {
					setError(error);
					return;
				}
				setAuthToken(token);
				setCurrentScope(response);
			} catch {
				setState(redirect_scope);
			}
		};

		if (scope) {
			if (key) {
				setState('validate');
			} else {
				if (scope === 'environment') {
					fetchAuthToken('login');
				} else if (scope === 'project' || scope === 'organization') {
					fetchAuthToken(scope);
				}
			}
		} else {
			if (key) {
				setState('validate');
			} else {
				fetchAuthToken('login');
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key, keyAccount, scope]);

	useEffect(() => {
		if (state === 'validate') {
			(async () => {
				const {
					valid,
					scope: keyScope,
					error,
				} = await validateApiKeyScope(key ?? '', scope ?? 'environment');
				if (!valid || error) {
					setError(error ?? 'Invalid Key Provided');
				} else {
					setAuthToken(key ?? '');
					setCurrentScope(keyScope);
				}
			})();
		}
	}, [key, scope, state, validateApiKeyScope]);

	useEffect(() => {
		if (
			(state === 'organization' && organization) ||
			(state === 'project' && project)
		) {
			(async () => {
				const { response, error } = await getApiKeyList(
					state === 'organization' ? 'org' : 'project',
					internalAuthToken ?? '',
					cookie,
					project,
				);
				if (error || response.data.length === 0) {
					setError(error ?? 'No API Key found');
					return;
				}
				const apiKeyId = response.data[0]?.id ?? '';
				const { response: secret, error: err } = await getApiKeyById(
					apiKeyId,
					internalAuthToken ?? '',
					cookie,
				);
				if (err) {
					setError(err);
					return;
				}
				setAuthToken(secret.secret ?? '');
				setCurrentScope({
					organization_id: secret.organization_id,
					project_id: secret.project_id ?? null,
					environment_id: secret.environment_id ?? null,
				});
			})();
		}
	}, [
		cookie,
		getApiKeyById,
		getApiKeyList,
		internalAuthToken,
		organization,
		project,
		state,
	]);

	const handleLoginSuccess = useCallback(
		(
			_organisation: ActiveState,
			_project: ActiveState,
			_environment: ActiveState,
			secret: string,
		) => {
			setAuthToken(secret);
			setCurrentScope({
				organization_id: _organisation.value,
				project_id: _project.value,
				environment_id: _environment.value,
			});
		},
		[],
	);

	const onLoginSuccess = useCallback((accessToken: string, cookie: string) => {
		setInternalAuthToken(accessToken);
		setCookie(cookie);
	}, []);

	return (
		<>
			{state === 'loading' && <Text>Loading Token</Text>}
			{(state === 'organization' || state === 'project') && (
				<>
					<LoginFlow onSuccess={onLoginSuccess} onError={setError} />
					{internalAuthToken && cookie && !organization && (
						<SelectOrganization
							accessToken={internalAuthToken}
							onComplete={organization => setOrganization(organization.value)}
							onError={setError}
							cookie={cookie}
						/>
					)}
					{state === 'project' &&
						internalAuthToken &&
						cookie &&
						organization &&
						!project && (
							<SelectProject
								accessToken={internalAuthToken}
								onComplete={project => setProject(project.value)}
								cookie={cookie}
								onError={setError}
							/>
						)}
				</>
			)}
			{state === 'login' && (
				<>
					<Login options={{}} loginSuccess={handleLoginSuccess} />
				</>
			)}
			{state === 'done' && authToken && currentScope && (
				<AuthContext.Provider
					value={{
						authToken: authToken,
						loading: loading,
						error: error,
						scope: currentScope,
					}}
				>
					{!loading && !error && children}
				</AuthContext.Provider>
			)}
			{error && <Text>{error}</Text>}
		</>
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
