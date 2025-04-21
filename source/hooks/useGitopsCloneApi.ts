import { useCallback } from 'react';
import useClient from './useClient.js';

function convertGitSshToHttps(sshUrl: string): string {
	if (!sshUrl.startsWith('git@')) {
		throw new Error('Invalid SSH URL');
	}

	// Step 1: Remove 'git@'
	const parts: string[] = sshUrl.split('@');
	if (parts.length !== 2) {
		throw new Error('Malformed SSH URL');
	}

	const domainAndPath: string = parts[1] ?? ''; // "github.com:Abiji-2020/PermitTest.git"

	// Step 2: Find the ':' separator
	const index: number = domainAndPath.indexOf(':');
	if (index === -1) {
		throw new Error('Invalid SSH URL format');
	}

	const domain: string = domainAndPath.substring(0, index); // "github.com"
	const path: string = domainAndPath.substring(index + 1); // "Abiji-2020/PermitTest.git"

	// Step 3: Construct the HTTPS URL
	let httpsUrl: string = `https://${domain}/${path}`;

	// Step 4: Remove '.git' suffix if present
	if (httpsUrl.endsWith('.git')) {
		httpsUrl = httpsUrl.slice(0, -4);
	}

	return httpsUrl;
}

export default function useGitOpsCloneApi() {
	const { authenticatedApiClient } = useClient();

	const fetchActivePolicyRepo = useCallback(async (): Promise<
		string | null
	> => {
		const client = authenticatedApiClient();
		const { data, error } = await client.GET(
			`/v2/projects/{proj_id}/repos/active`,
		);
		if (error) {
			throw new Error(`Failed to fetch Active policy Repository: ${error}`);
		}
		if (data) {
			if (data.url.startsWith('git@')) {
				return convertGitSshToHttps(data.url);
			}

			return data.url;
		}
		return null;
	}, [authenticatedApiClient]);
	return { fetchActivePolicyRepo };
}
