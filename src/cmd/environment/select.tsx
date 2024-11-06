import React, { useEffect, useState } from 'react';
import { Text, Newline } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { apiCall } from '../../utils/apiCall.js';
import { APIError } from '../../errors/errors.js';
import { getOrgs, Organization } from '../../lib/organization.js';
import { getProjects, Project } from '../../lib/project.js';
import { Environment } from '../../lib/environment.js';
import { getEnvironments } from '../../lib/environment.js';
import { saveAuthToken } from '../../lib/token.js';

type Props = {
	accessToken: string;
	apiKey?: string;
	cookieProp?: string;
	workspace?: string;
};

export default function EnvironmentSelect({
	accessToken,
	apiKey,
	cookieProp,
	workspace,
}: Props) {
	enum State {
		Org = 'org',
		Project = 'project',
		Environment = 'environment',
		FetchOrgs = 'fetchOrgs',
		Failed = 'failed',
		Done = 'done',
	}

	const [state, setState] = useState<State>(State.Org);
	const [err, setError] = useState('');
	const [orgs, setOrgs] = useState<any[]>([]);
	const [cookie, setCookie] = useState<string | undefined>(cookieProp);
	const [activeOrg, setActiveOrg] = useState<any | undefined>(null);
	const [activeProject, setActiveProject] = useState<any | undefined>(null);
	const [activeEnvironment, setActiveEnvironment] = useState<any | undefined>(
		null,
	);
	const [projects, setProjects] = useState<any[]>([]);
	const [environments, setEnvironments] = useState<any[]>([]);

	useEffect(() => {
		const fetchOrgs = async () => {
			const result = await getOrgs(accessToken ?? '');
			if (result instanceof APIError) {
				setError(result.message);
				setState(State.Failed);
			} else {
				const orgs: Organization[] = result;
				if (orgs.length === 0) {
					await open('https://app.permit.io');
					setState(State.FetchOrgs);
				}

				const selectedOrg = orgs.find(
					(org: any) => workspace && org.key === workspace,
				);

				if (selectedOrg) {
					setActiveOrg({ label: selectedOrg.name, value: selectedOrg.id });
					setState(State.Project);
				} else if (orgs.length === 1) {
					setActiveOrg({ label: orgs[0]?.name, value: orgs[0]?.id });
					setState(State.Project);
				}
				const orgsList = orgs.map((org: Organization) => ({
					label: org.name,
					value: org.id,
				}));
				setOrgs(orgsList);
			}
		};

		if (state === State.Org && accessToken) {
			fetchOrgs();
		}
	}, [state, accessToken, cookie, apiKey]);

	useEffect(() => {
		const fetchProjects = async () => {
			let newCookie = cookie ?? '';

			const res = await apiCall(
				`v2/auth/switch_org/${activeOrg.value}`,
				accessToken ?? '',
				cookie ?? '',
				'POST',
			);

			if (res instanceof APIError) {
				setError(res.message);
				setState(State.Failed);
			} else {
				newCookie = res.headers.getSetCookie()[0] ?? '';
				setCookie(newCookie);
			}

			const result = await getProjects(accessToken ?? '', newCookie);
			if (result instanceof APIError) {
				setError(result.message);
				setState(State.Failed);
			}

			const projects = result as Project[];

			if (projects.length === 1) {
				setActiveProject({ label: projects[0]?.name, value: projects[0]?.id });
				setState(State.Environment);
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
	}, [activeOrg]);

	useEffect(() => {
		const fetchEnvironments = async () => {
			const environments = await getEnvironments(
				accessToken ?? '',
				cookie ?? '',
				activeProject.value,
			);
			if (environments instanceof APIError) {
				setError(environments.message);
				setState(State.Failed);
			} else {
				setEnvironments(
					environments.map((environment: Environment) => ({
						label: environment.name,
						value: environment.id,
					})),
				);
			}
		};

		if (activeProject) {
			fetchEnvironments();
		}
	}, [activeProject]);

	useEffect(() => {
		if (state === State.Done) {
			process.exit(0);
		}
	}, [state]);

	const onOrgSelect =  (org: any) => {
		setActiveOrg(org);
		setState(State.Project);
	};

	const onProjectSelect =  (project: any) => {
		setActiveProject(project);
		setState(State.Environment);
	};

	const onEnvironmentSelect = async (environment: any) => {
		setActiveEnvironment(environment);
		const res = await apiCall(
				`v2/api-key/${activeProject.value}/${environment.value}`,
				accessToken ?? '',
				cookie,
			);
			if (res instanceof APIError) {
				setError(res.message);
				setState(State.Failed);
			} else {
				await saveAuthToken(res.response.secret);
				setState(State.Done);
		}
	};

	return (
		<>
			{state === State.FetchOrgs && (
				<>
					<Text bold={true}>
						Create your first workspace. check https://app.permit.io.
						<Newline />
						After creating workspace, press enter to continue.
					</Text>
					<SelectInput
						items={[{ label: 'I have created workspace', value: "" }]}
						onSelect={() => setState(State.Org)}
					/>
				</>
			)}
			{state === State.Org &&
				(orgs && orgs.length > 0 ? (
					<>
						<Text>Select an organization</Text>
						<SelectInput items={orgs} onSelect={onOrgSelect} />
					</>
				) : (
					<Text>
						<Spinner type="dots" /> Loading Organizations
					</Text>
				))}
			{state === State.Project &&
				(projects && projects.length > 0 ? (
					<>
						<Text>Select a project</Text>
						<SelectInput
							items={projects}
							onSelect={onProjectSelect}
						/>
					</>
				) : (
					<Text>
						<Spinner type="dots" /> Loading Projects
					</Text>
				))}
			{state === State.Environment &&
				(environments && environments.length > 0 ? (
					<>
						<Text>Select an environment</Text>
						<SelectInput
							items={environments}
							onSelect={onEnvironmentSelect}
						/>
					</>
				) : (
					<Text>
						<Spinner type="dots" /> Loading Environments
					</Text>
				))}
			{state === State.Done && activeOrg && (
				<Text bold={true} color="green"> 
					Logged in as {activeOrg.label} with selected environment as{' '}
					{activeEnvironment ? activeEnvironment.label : 'None'}
				</Text>
			)}
			{state === State.Failed && err && <Text color="red" bold={true} >{err}</Text>}
		</>
	);
}
