import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { type infer as zInfer, object, string } from 'zod';
import { option } from 'pastel';
import { apiCall } from '../lib/api.js';
import {
	authCallbackServer,
	browserAuth,
	saveAuthToken,
	TokenType,
	tokenType,
} from '../lib/auth.js';

export const options = object({
	key: string()
		.optional()
		.describe(
			option({
				description: 'Use API key instead of user authentication',
				alias: 'k',
			}),
		),
	workspace: string()
		.optional()
		.describe(
			option({
				description: 'Use predefined workspace to Login',
			}),
		),
});

type Props = {
	readonly options: zInfer<typeof options>;
};

interface Org {
	id: string;
	key: string;
	name: string;
}

interface Project {
	id: string;
	name: string;
}

interface Environment {
	id: string;
	name: string;
}

interface SelectItem {
	label: string;
	value: string;
}

interface ApiKeyResponse {
	secret: string;
}

export default function Login({ options: { key, workspace } }: Props) {
	const [authError, setAuthError] = useState('');
	const [orgs, setOrgs] = useState<SelectItem[]>([]);
	const [accessToken, setAccessToken] = useState<string | undefined>();
	const [cookie, setCookie] = useState<string>('');
	const [activeOrg, setActiveOrg] = useState<SelectItem | undefined>(undefined);
	const [activeProject, setActiveProject] = useState<SelectItem | undefined>(
		undefined,
	);
	const [activeEnvironment, setActiveEnvironment] = useState<
		SelectItem | undefined
	>(undefined);
	const [projects, setProjects] = useState<SelectItem[]>([]);
	const [environments, setEnvironments] = useState<SelectItem[]>([]);
	const [state, setState] = useState<
		'login' | 'loggingIn' | 'org' | 'project' | 'environment' | 'done'
	>('login');

	useEffect(() => {
		const fetchOrgs = async () => {
			if (!accessToken) return;

			const { response: orgs } = await apiCall<Org[]>(
				'v2/orgs',
				accessToken,
				cookie,
			);

			const selectedOrg = orgs.find(
				(org: Org) => workspace && org.key === workspace,
			);

			if (selectedOrg) {
				setActiveOrg({ label: selectedOrg.name, value: selectedOrg.id });
				setState('project');
			} else if (orgs && orgs.length === 1) {
				setActiveOrg({ label: orgs[0]?.name ?? '', value: orgs[0]?.id ?? '' });
				setState('project');
			}

			setOrgs(orgs.map((org: Org) => ({ label: org.name, value: org.id })));
		};

		if (state === 'org' && accessToken) {
			fetchOrgs();
		}
	}, [state, accessToken, cookie, workspace]);

	useEffect(() => {
		const fetchProjects = async () => {
			if (!activeOrg || !accessToken) return;

			let newCookie = cookie;

			const { headers } = await apiCall<unknown>(
				`v2/auth/switch_org/${activeOrg.value}`,
				accessToken,
				newCookie,
				'POST',
			);

			newCookie = headers.getSetCookie()[0] ?? '';
			setCookie(newCookie);

			const { response: projects } = await apiCall<Project[]>(
				'v2/projects',
				accessToken,
				newCookie,
			);

			if (projects.length === 1) {
				setActiveProject({
					label: projects[0]?.name ?? '',
					value: projects[0]?.id ?? '',
				});
				setState('environment');
			}

			setProjects(
				projects.map((project: Project) => ({
					label: project.name,
					value: project.id,
				})),
			);
		};

		if (activeOrg) {
			fetchProjects();
		}
	}, [activeOrg, accessToken, cookie]);

	useEffect(() => {
		const fetchEnvironments = async () => {
			if (!activeProject || !accessToken) return;

			const { response: environments } = await apiCall<Environment[]>(
				`v2/projects/${activeProject.value}/envs`,
				accessToken,
				cookie,
			);
			setEnvironments(
				environments.map((environment: Environment) => ({
					label: environment.name,
					value: environment.id,
				})),
			);
		};

		if (activeProject) {
			fetchEnvironments();
		}
	}, [activeProject, accessToken, cookie]);

	useEffect(() => {
		if (state === 'done') {
			// eslint-disable-next-line no-undef
			process.exit(0);
		}
	}, [state]);

	const handleOrgSelect = async (org: SelectItem) => {
		setActiveOrg(org);
		setState('project');
	};

	useEffect(() => {
		const authenticateUser = async () => {
			setState('loggingIn');
			if (key && tokenType(key) === TokenType.APIToken) {
				setAccessToken(key);
			} else if (key) {
				setAuthError('Invalid API Key');
				setState('done');
			} else {
				// Open the authentication URL in the default browser
				const verifier = await browserAuth();
				const token = await authCallbackServer(verifier);
				const { headers } = await apiCall<unknown>(
					'v2/auth/login',
					token ?? '',
					'',
					'POST',
				);
				setAccessToken(token);
				setCookie(headers.getSetCookie()[0] ?? '');
			}

			setState('org');
		};

		authenticateUser();
	}, [key]);

	return (
		<>
			{state === 'login' && <Text>Login to Permit</Text>}
			{state === 'loggingIn' && (
				<Text>
					<Spinner type="dots" /> Logging in...
				</Text>
			)}
			{state === 'org' &&
				(orgs && orgs.length > 0 ? (
					<>
						<Text>Select an organization</Text>
						<SelectInput items={orgs} onSelect={handleOrgSelect} />
					</>
				) : (
					<Text>
						<Spinner type="dots" /> Loading Organizations
					</Text>
				))}
			{state === 'project' &&
				(projects && projects.length > 0 ? (
					<>
						<Text>Select a project</Text>
						<SelectInput
							items={projects}
							onSelect={project => {
								setActiveProject(project);
								setState('environment');
							}}
						/>
					</>
				) : (
					<Text>
						<Spinner type="dots" /> Loading Projects
					</Text>
				))}
			{state === 'environment' &&
				(environments && environments.length > 0 ? (
					<>
						<Text>Select an environment</Text>
						<SelectInput
							items={environments}
							onSelect={async environment => {
								setActiveEnvironment(environment);
								if (activeProject && accessToken) {
									const { response } = await apiCall<ApiKeyResponse>(
										`v2/api-key/${activeProject.value}/${environment.value}`,
										accessToken,
										cookie,
									);
									await saveAuthToken(response.secret);
								}
								setState('done');
							}}
						/>
					</>
				) : (
					<Text>
						<Spinner type="dots" /> Loading Environments
					</Text>
				))}
			{state === 'done' && activeOrg && (
				<Text>
					Logged in as {activeOrg.label} with selected environment as{' '}
					{activeEnvironment ? activeEnvironment.label : 'None'}
				</Text>
			)}
			{state === 'done' && authError && <Text>{authError}</Text>}
		</>
	);
}
