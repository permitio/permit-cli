/**
 * AuthProvider: A React context provider for managing authentication and authorization states.
 *
 * This component handles authentication flows, API key validation, and token management.
 */

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
import {
	ApiKeyCreate,
	ApiKeyScope,
	useApiKeyApi,
} from '../hooks/useApiKeyApi.js';
import { ActiveState } from './EnvironmentSelection.js';
import LoginFlow from './LoginFlow.js';
import SelectOrganization from './SelectOrganization.js';
import SelectProject from './SelectProject.js';
import { useAuthApi } from '../hooks/useAuthApi.js';
import {
	globalScopeGetterSetter,
	globalTokenGetterSetter,
} from '../hooks/useClient.js';

// Define the AuthContext type
export type AuthContextType = {
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
	const [currentScope, setCurrentScope] = useState<
		ApiKeyScope | null | undefined
	>(null);
	const [keyCreated, setKeyCreated] = useState<boolean>(false);

	// Handles all the error
	useEffect(() => {
		if (error) {
			process.exit(1);
		}
	}, [error]);

	// Step 4 If we have collected all the data needed by auth provider we set the state to 'done'
	useEffect(() => {
		if (authToken.length !== 0 && currentScope) {
			// Inject the auth token
			globalTokenGetterSetter.tokenSetter(authToken);
			globalScopeGetterSetter.scopeSetter(currentScope);
			setLoading(false);
			setState('done');
		}
	}, [authToken, currentScope]);

	// Step: 1, This useEffect is the heart of AuthProvider, it decides which flow to choose based on the props passed.
	useEffect(() => {
		// Loads the token stored on our system if any, if no token is found or if the scope of the token is not right,
		// we redirect user to login.
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

		// If user passes the scope
		// and passes the key, we go to step 2
		// otherwise we call auth token with the provided scope
		// If scope is not passed, it is defaulted to 'environment'
		// and if key is provided we redirect to step 2
		// otherwise we redirect to fetchAuthToken
		if (scope) {
			// If scope is given then
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

	// Step 2, Validates the api key and matches it with the scope
	useEffect(() => {
		if (state === 'validate') {
			(async () => {
				const {
					valid,
					scope: keyScope,
					error,
				} = await validateApiKeyScope(key ?? '', scope ?? 'environment');
				if (!valid || error) {
					setError(error?.toString() ?? 'Invalid Key Provided');
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

	// Step 3, if we don't find the key in our system, or if it's invalid we prompt the user to select the respective
	// organization & project based on the scope, and then finally redirect user to Step 4.
	useEffect(() => {
		if (
			(state === 'organization' && organization) ||
			(state === 'project' && project)
		) {
			(async () => {
				const { data: response, error } = await getApiKeyList(
					state === 'organization' ? 'org' : 'project',
					project,
					internalAuthToken ?? '',
					newCookie,
				);
				if (error) {
					setError(`Error while getting api key list ${error}`);
					return;
				}

				let cliApiKey = response?.data.find(
					apiKey => apiKey.name === 'CLI_API_Key',
				);

				if (!cliApiKey && organization) {
					setState('creating-key');
					let body: ApiKeyCreate = {
						organization_id: organization,
						name: 'CLI_API_Key',
						object_type: 'org',
						access_level: 'admin',
						owner_type: 'member',
					};
					if (state === 'project') {
						body.object_type = 'project';
						body.project_id = project ?? '';
					}
					const { data: creationResponse, error: creationError } =
						await createApiKey(body, internalAuthToken, newCookie);
					if (creationError) {
						setError(`Error while creating Key: ${creationError}`);
					}
					cliApiKey = creationResponse;
					setKeyCreated(true);
				}
				const apiKeyId = cliApiKey?.id ?? '';
				const { data: secret, error: err } = await getApiKeyById(
					apiKeyId,
					internalAuthToken ?? '',
					newCookie,
				);
				if (err) {
					setError(`Error while getting api key by id: ${err}`);
					return;
				}
				setAuthToken(secret?.secret ?? '');
				setCurrentScope({
					organization_id: secret?.organization_id ?? '',
					project_id: secret?.project_id ?? undefined,
					environment_id: secret?.environment_id ?? undefined,
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
					<Login
						options={{}}
						loginSuccess={handleLoginSuccess}
						notInAuthContext={true}
					/>
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
