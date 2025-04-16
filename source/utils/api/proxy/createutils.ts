
export type ProxyConfigOptions = {
	secret: Record<string, never>; 
	key: string;
	name: string;
	/**
	 * A list of mapping rules. Each rule defines how to map the request for a given URL/method,
	 * along with any headers that should be included.
	 */
	mapping_rules?: Array<{
		url: string;
		http_method: 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch';
		resource: string;
		headers: Record<string, string>;
		action?: string;
		priority?: number;
	}>;
	/**
	 * The authentication mechanism. Defaults to Bearehar if not provided.
	 */
	auth_mechanism: 'Bearer' | 'Basic' | 'Headers';
};

/**
 * Validates the proxy config options.
 * Throws an error if validation fails.
 */
export function validateProxyConfig(options: ProxyConfigOptions) {
	const keyRegex = /^[A-Za-z0-9\-_]+$/;
	
	if (!options.key) {
		throw new Error('Missing Error: key is required');
	}
	if (!keyRegex.test(options.key)) {
		throw new Error('Validation Error: Invalid key');
	}
	if (!options.secret) {
		throw new Error('Missing Error: secret is required');
	}
	if (!options.name) {
		throw new Error('Missing Error: name is required');
	}
	// Optionally, add further validation for mapping_rules if needed.
	return true;
}
