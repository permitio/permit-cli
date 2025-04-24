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
		url_type?: 'regex' | 'none';
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
 * Collects all errors and throws a combined error if any validations fail.
 */
export function validateProxyConfig(options: ProxyConfigOptions) {
	const errors: string[] = [];
	const keyRegex = /^[A-Za-z0-9\-_]+$/;
	const allowedAuth = ['Bearer', 'Basic', 'Headers'];

	// Validate name
	if (!options.name?.trim()) {
		errors.push('Missing Error: name is required');
	}

	// Validate key (optional)
	if (options.key && !keyRegex.test(options.key)) {
		errors.push('Validation Error: Invalid key');
	}

	// Validate auth_mechanism
	if (!allowedAuth.includes(options.auth_mechanism)) {
		errors.push(
			'Validation Error: auth_mechanism must be one of Bearer, Basic, or Headers',
		);
	}

	// Validate secret based on auth_mechanism
	switch (options.auth_mechanism) {
		case 'Bearer':
			if (typeof options.secret !== 'string' || !options.secret.trim()) {
				errors.push(
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
				errors.push(
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
				errors.push(
					'Validation Error: Headers secret must be an object of headers',
				);
			} else {
				Object.entries(options.secret).forEach(([hdr, val]) => {
					if (typeof val !== 'string') {
						errors.push(
							`Validation Error: secret header '${hdr}' must be a string`,
						);
					}
				});
			}
			break;
	}

	// Validate mapping_rules
	if (options.mapping_rules !== undefined) {
		if (!Array.isArray(options.mapping_rules)) {
			errors.push('Validation Error: mapping_rules must be an array');
		} else {
			options.mapping_rules.forEach((rule, idx) => {
				const base = `mapping_rules[${idx}]`;
				if (!rule.url?.trim()) {
					errors.push(`Missing Error: ${base}.url is required`);
				} else {
					try {
						new URL(rule.url);
					} catch {
						errors.push(`Validation Error: ${base}.url is invalid`);
					}
				}
				if (!rule.http_method) {
					errors.push(`Missing Error: ${base}.http_method is required`);
				}
				if (!rule.resource?.trim() || !keyRegex.test(rule.resource)) {
					errors.push(
						`Validation Error: ${base}.resource is invalid ('${rule.resource}')`,
					);
				}
				if (rule.headers !== undefined) {
					if (typeof rule.headers !== 'object' || Array.isArray(rule.headers)) {
						errors.push(`Validation Error: ${base}.headers must be an object`);
					} else {
						Object.entries(rule.headers).forEach(([hk, hv]) => {
							if (typeof hv !== 'string') {
								errors.push(
									`Validation Error: ${base}.headers['${hk}'] must be a string`,
								);
							}
						});
					}
				}
				if (rule.url_type && rule.url_type !== 'regex') {
					errors.push(
						`Validation Error: ${base}.url_type must be 'regex' if provided`,
					);
				}
				if (rule.priority !== undefined && typeof rule.priority !== 'number') {
					errors.push(`Validation Error: ${base}.priority must be a number`);
				}
			});
		}
	}

	// Throw aggregated error or return success
	if (errors.length) {
		throw new Error(`Configuration errors:\n${errors.join('\n')}`);
	}
	return true;
}
