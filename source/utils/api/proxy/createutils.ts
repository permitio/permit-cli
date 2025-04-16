
export type ProxyConfigOptions = {
	secret: string; 
	key: string;
	name: string;
	/**
	 * A list of mapping rules. Each rule defines how to map the request for a given URL/method,
	 * along with any headers that should be included.
	 */
	mapping_rules?: Array<{
		url: string;
		http_method: 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch';
		resource?: string;
		headers?: Record<string, string>;
		action?: string;
		priority?: number;
	}>;
	/**
	 * The authentication mechanism. Defaults to Bearer if not provided.
	 */
	auth_mechanism: 'Bearer' | 'Basic' | 'Headers';
};

/**
 * Validates the proxy config options.
 * Throws an error if validation fails.
 */
export function validateProxyConfig(options: ProxyConfigOptions) {
	// Validate key: must be non-empty and match the regex.
	const keyRegex = /^[A-Za-z0-9\-_]+$/;
	if (!options.key || options.key.trim() === '') {
		throw new Error('Missing Error: key is required');
	}
	if (!keyRegex.test(options.key)) {
		throw new Error('Validation Error: Invalid key');
	}

	// Validate secret: must be a non-empty string.
	if (options.secret === undefined || options.secret.trim() === '') {
		throw new Error('Missing Error: secret is required');
	}

	// Validate name: must be non-empty.
	if (!options.name || options.name.trim() === '') {
		throw new Error('Missing Error: name is required');
	}

	// Validate auth_mechanism: must be one of 'Bearer', 'Basic', or 'Headers'
	const allowedAuth = ['Bearer', 'Basic', 'Headers'];
	if (!allowedAuth.includes(options.auth_mechanism)) {
		throw new Error('Validation Error: auth_mechanism must be one of Bearer, Basic, or Headers');
	}

	if (options.mapping_rules) {
		if (!Array.isArray(options.mapping_rules)) {
			throw new Error('Validation Error: mapping_rules must be an array');
		}

		options.mapping_rules.forEach((rule, index) => {
			if (!rule.url || rule.url.trim() === '') {
				throw new Error(`Missing Error: mapping_rules[${index}].url is required`);
			}
			try {
				new URL(rule.url);
			} catch (err) {
				throw new Error(`Validation Error: mapping_rules[${index}].url is invalid`);
			}

			if (!rule.resource || rule.resource.trim() === '') {
				throw new Error(`Missing Error: mapping_rules[${index}].resource is required`);
			}

			if (!rule.headers || typeof rule.headers !== 'object') {
				throw new Error(`Validation Error: mapping_rules[${index}].headers must be an object`);
			}

			Object.entries(rule.headers).forEach(([headerKey, headerValue]) => {
				if (typeof headerValue !== 'string') {
					throw new Error(`Validation Error: mapping_rules[${index}].headers['${headerKey}'] must be a string`);
				}
			});

			// Validate http_method is provided (it should be since it's required by type).
			if (!rule.http_method) {
				throw new Error(`Missing Error: mapping_rules[${index}].http_method is required`);
			}
		});
	}

	return true;
}
