import { APIError } from "../errors/errors.js";
import { apiCall } from "../utils/apiCall.js";


export type Environment = {
	key: string;
	id: string;
	organization_id: string;
	project_id: string;
	created_at: string;
	updated_at: string;
	avp_policy_store_id: string;
	name: string;
	description: string;
	custom_branch_name: string;
	jwks: {
		ttl: number;
		url: string;
		jwks: {
			keys: Array<Record<string, any>>;
		};
	};
	settings: Record<string, any>;
	email_configuration: string;
};

export const getEnvironments = async (
	accessToken: string,
	cookie: string,
	projectId: string,
): Promise<Environment[] | APIError> => {
	const result = await apiCall(
		`v2/projects/${projectId}/envs`,
		accessToken,
		cookie,
	);

	if (result instanceof APIError) {
		return result;
	}

	return result.response as Environment[];
};
