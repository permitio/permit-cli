export type ProxyConfigOptions = {
	secret: string | Record<string, string>;
	key: string;
	name: string;
	/**
	 * A list of mapping rules. Each rule defines how to map the request for a given URL/method,
	 * along with any headers that should be included.
	 */
	mapping_rules?: Array<{
		url: string;
		url_type?: 'regex';
		http_method:
			| 'get'
			| 'put'
			| 'post'
			| 'delete'
			| 'options'
			| 'head'
			| 'patch';
		resource: string;
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
	const keyRegex = /^[A-Za-z0-9\-_]+$/;

	// Validate key
	if (!options.key?.trim()) {
		throw new Error('Missing Error: key is required');
	}
	if (!keyRegex.test(options.key)) {
		throw new Error('Validation Error: Invalid key');
	}

	// Validate name
	if (!options.name?.trim()) {
		throw new Error('Missing Error: name is required');
	}

	// Validate auth_mechanism
	const allowedAuth = ['Bearer', 'Basic', 'Headers'];
	if (!allowedAuth.includes(options.auth_mechanism)) {
		throw new Error(
			'Validation Error: auth_mechanism must be one of Bearer, Basic, or Headers',
		);
	}

	// Validate secret based on auth_mechanism
	switch (options.auth_mechanism) {
		case 'Bearer':
			if (typeof options.secret !== 'string' || !options.secret.trim()) {
				throw new Error(
					'Validation Error: Bearer secret must be a non-empty string',
				);
			}
			break;
		case 'Basic':
			if (
				typeof options.secret !== 'string' ||
				!options.secret.trim() ||
				!/.+:.+/.test(options.secret)
			) {
				throw new Error(
					'Validation Error: Basic secret must be a string of the form "username:password"',
				);
			}
			break;
		case 'Headers':
			if (
				typeof options.secret !== 'object' ||
				options.secret === null ||
				Array.isArray(options.secret)
			) {
				throw new Error(
					'Validation Error: Headers secret must be an object of headers',
				);
			}
			Object.entries(options.secret).forEach(([key, value]) => {
				if (typeof value !== 'string') {
					throw new Error(
						`Validation Error: secret header '${key}' must be a string`,
					);
				}
			});
			break;
	}

	// Validate mapping_rules
	if (options.mapping_rules) {
		if (!Array.isArray(options.mapping_rules)) {
			throw new Error('Validation Error: mapping_rules must be an array');
		}

		options.mapping_rules.forEach((rule, index) => {
			if (!rule.url?.trim()) {
				throw new Error(
					`Missing Error: mapping_rules[${index}].url is required`,
				);
			}
			try {
				new URL(rule.url);
			} catch {
				throw new Error(
					`Validation Error: mapping_rules[${index}].url is invalid`,
				);
			}

			if (!rule.http_method) {
				throw new Error(
					`Missing Error: mapping_rules[${index}].http_method is required`,
				);
			}

			if (!rule.resource?.trim() || !keyRegex.test(rule.resource)) {
				throw new Error(
					`Validation Error: mapping_rules[${index}].resource is invalid`,
				);
			}

			if (rule.headers) {
				if (typeof rule.headers !== 'object' || Array.isArray(rule.headers)) {
					throw new Error(
						`Validation Error: mapping_rules[${index}].headers must be an object`,
					);
				}
				Object.entries(rule.headers).forEach(([headerKey, headerValue]) => {
					if (typeof headerValue !== 'string') {
						throw new Error(
							`Validation Error: mapping_rules[${index}].headers['${headerKey}'] must be a string`,
						);
					}
				});
			}

			// Optional validations
			if (rule.url_type && rule.url_type !== 'regex') {
				throw new Error(
					`Validation Error: mapping_rules[${index}].url_type must be 'regex' if provided`,
				);
			}

			if (rule.priority !== undefined && typeof rule.priority !== 'number') {
				throw new Error(
					`Validation Error: mapping_rules[${index}].priority must be a number`,
				);
			}
		});
	}

	return true;
}
