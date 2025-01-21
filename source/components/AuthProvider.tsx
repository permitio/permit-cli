import React, {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from 'react';
import { Text, Newline } from 'ink';
import { loadAuthToken } from '../lib/auth.js';
import Login from '../commands/login.js';
import { ApiKeyScope, useApiKeyApi } from '../hooks/useApiKeyApi.js';
import { ActiveState } from './EnvironmentSelection.js';
import LoginFlow from './LoginFlow.js';
import SelectOrganization from './SelectOrganization.js';
import SelectProject from './SelectProject.js';
import { useAuthApi } from '../hooks/useAuthApi.js';

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
};

export function AuthProvider({
	children,
	permit_key: key,
	scope,
}: AuthProviderProps) {
	const { validateApiKeyScope, getApiKeyList, getApiKeyById, createApiKey } =
		useApiKeyApi();
	const { authSwitchOrgs } = useAuthApi();

	const [internalAuthToken, setInternalAuthToken] = useState<string | null>(
		null,
	);
	const [authToken, setAuthToken] = useState<string>('');
	const [cookie, setCookie] = useState<string | null>(null);
	const [newCookie, setNewCookie] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [state, setState] = useState<
		| 'loading'
		| 'validate'
		| 'creating-key'
		| 'organization'
		| 'project'
		| 'login'
		| 'done'
	>('loading');
	const [organization, setOrganization] = useState<string | null>(null);
	const [project, setProject] = useState<string | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [currentScope, setCurrentScope] = useState<ApiKeyScope | null>(null);
	const [keyCreated, setKeyCreated] = useState<boolean>(false);

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
				const token = await loadAuthToken();
				const {
					valid,
					scope: keyScope,
					error,
				} = await validateApiKeyScope(
					token,
					redirect_scope === 'login' ? 'environment' : redirect_scope,
				);
				if (error || !valid) {
					throw Error('Invalid token scope, redirecting to login of choice');
				}
				setAuthToken(token);
				setCurrentScope(keyScope);
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
	}, [key, scope]);

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

	const switchActiveOrganization = useCallback(
		async (organization_id: string) => {
			const { headers, error } = await authSwitchOrgs(
				organization_id,
				internalAuthToken,
				cookie,
			);

			if (error) {
				setError(`Error while selecting active workspace: ${error}`);
				return;
			}

			let newCookie = headers.getSetCookie()[0] ?? '';
			setNewCookie(newCookie);
		},
		[authSwitchOrgs, internalAuthToken, cookie],
	);

	useEffect(() => {
		if (
			(state === 'organization' && organization) ||
			(state === 'project' && project)
		) {
			(async () => {
				const { response, error } = await getApiKeyList(
					state === 'organization' ? 'org' : 'project',
					internalAuthToken ?? '',
					newCookie,
					project,
				);
				if (error) {
					setError(`Error while getting api key list ${error}`);
					return;
				}

				let cliApiKey = response.data.find(
					apiKey => apiKey.name === 'CLI_API_Key',
				);

				if (!cliApiKey) {
					setState('creating-key');
					let body = {
						organization_id: organization,
						name: 'CLI_API_Key',
						object_type: 'org',
					};
					if (state === 'project') {
						body.object_type = 'project';
						// @ts-expect-error custom param addition
						body.project_id = project;
					}
					const { response: creationResponse, error: creationError } =
						await createApiKey(
							internalAuthToken ?? '',
							JSON.stringify(body),
							newCookie,
						);
					if (creationError) {
						setError(`Error while creating Key: ${creationError}`);
					}
					cliApiKey = creationResponse;
					setKeyCreated(true);
				}
				const apiKeyId = cliApiKey?.id ?? '';
				const { response: secret, error: err } = await getApiKeyById(
					apiKeyId,
					internalAuthToken ?? '',
					newCookie,
				);
				if (err) {
					setError(`Error while getting api key by id: ${err}`);
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
		newCookie,
		getApiKeyById,
		getApiKeyList,
		internalAuthToken,
		organization,
		project,
		state,
		createApiKey,
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
							onComplete={async organization => {
								setOrganization(organization.value);
								await switchActiveOrganization(organization.value);
							}}
							onError={setError}
							cookie={cookie}
						/>
					)}
					{state === 'project' &&
						internalAuthToken &&
						newCookie &&
						organization &&
						!project && (
							<SelectProject
								accessToken={internalAuthToken}
								onComplete={project => setProject(project.value)}
								cookie={newCookie}
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
			{state === 'creating-key' && (
				<>
					<Text>CLI_API_Key not found, creating one for you.</Text>
				</>
			)}
			{state === 'done' && authToken && currentScope && (
				<>
					{keyCreated && (
						<>
							<Text>
								Created an{' '}
								{currentScope.environment_id
									? 'environment'
									: currentScope.project_id
										? 'project'
										: 'organization'}{' '}
								level key for you, named CLI_API_key (this key is protected,
								please do not change it)
							</Text>
							<Newline />
						</>
					)}
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
				</>
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
