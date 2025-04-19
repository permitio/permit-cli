import { useMemo } from 'react';
import { type infer as zType } from 'zod';
import { options as originalOptions } from '../commands/api/create/proxy.js';
import { ProxyConfigOptions } from '../utils/api/proxy/createutils.js';

type CreateProxyOptions = zType<typeof originalOptions>;

// NonNullable to ensure we return an element of the array (not undefined).
type MappingRuleType = NonNullable<ProxyConfigOptions['mapping_rules']>[number];

/**
 * Parses a mapping rule string into a full mapping rule object.
 * Expected format: "method|url|resource|[action]|[priority]|[{Key:Value,...}]|[url_type]"
 */
function parseMappingRule(ruleStr: string, index: number): MappingRuleType {
	const parts = ruleStr.split('|').map(s => s.trim());

	// method, url, and resource are all required
	if (!parts[0]) {
		throw new Error(
			`Mapping rule at index ${index} must include an HTTP method as the first part.`,
		);
	}
	if (!parts[1]) {
		throw new Error(
			`Mapping rule at index ${index} must include a URL as the second part.`,
		);
	}
	if (!parts[2]) {
		throw new Error(
			`Mapping rule at index ${index} must include a resource as the third part.`,
		);
	}

	const httpMethod = parts[0].toLowerCase() as MappingRuleType['http_method'];
	const url = parts[1];
	const resource = parts[2];
	// validate resource format
	if (!/^[A-Za-z0-9\-_]+$/.test(resource)) {
		throw new Error(
			`Mapping rule at index ${index} has invalid resource "${resource}". Resource must match /^[A-Za-z0-9\\-_]+$/.`,
		);
	}

	// optional action comes after resource
	const action = parts[3] || undefined;

	// Parse priority
	const priorityNum = parts[4] ? Number(parts[4]) : undefined;
	const priority = Number.isNaN(priorityNum) ? undefined : priorityNum;

	// Parse headers: expect {Key:Value,...}
	const headersStr = parts[5] ?? '';
	let headers: Record<string, string> = {};
	if (headersStr.startsWith('{') && headersStr.endsWith('}')) {
		const inner = headersStr.slice(1, -1);
		inner.split(',').forEach(pair => {
			const [rawKey, rawVal] = pair.split(':');
			if (rawKey && rawVal) {
				headers[rawKey.trim()] = rawVal.trim();
			}
		});
	}

	// Parse url_type: 'regex' or 'none'
	const urlTypeRaw = (parts[6] ?? '').toLowerCase();
	const url_type = urlTypeRaw === 'regex' ? urlTypeRaw : undefined;

	return {
		http_method: httpMethod,
		url,
		resource,
		action,
		priority,
		headers,
		url_type,
	};
}

/**
 * Parses an array of mapping rule strings into an array of mapping rule objects.
 */
function parseMappingRules(
	rulesArray: string[],
): NonNullable<ProxyConfigOptions['mapping_rules']> {
	return rulesArray.map((ruleStr, index) => parseMappingRule(ruleStr, index));
}

// Define a type for individual mapping rule flags
type IndividualMappingRuleFlags = {
	mappingRuleMethod?: string;
	mappingRuleUrl?: string;
	mappingRuleResource?: string;
	mappingRuleAction?: string;
	mappingRulePriority?: number;
	mappingRuleHeaders?: string[];
	mappingRuleUrlType?: string;
};

// Update the function signature to use the new type
export function useParseProxyData(
	options: CreateProxyOptions & IndividualMappingRuleFlags,
): {
	payload: ProxyConfigOptions;
	parseError: string | null;
	updatePayloadKey: (newKey: string) => void;
} {
	return useMemo(() => {
		let parseError: string | null = null;
		let mapping_rules: ProxyConfigOptions['mapping_rules'] = [];

		// Parse mappingRules provided as array of strings, if any
		if (options.mappingRules) {
			try {
				mapping_rules = parseMappingRules(options.mappingRules as string[]);
			} catch (err) {
				parseError = err instanceof Error ? err.message : String(err);
			}
		}

		// Extract individual mapping rule flags
		const {
			mappingRuleMethod,
			mappingRuleUrl,
			mappingRuleResource,
			mappingRuleAction,
			mappingRulePriority,
			mappingRuleHeaders,
			mappingRuleUrlType,
		} = options;

		const hasIndividual =
			mappingRuleMethod && mappingRuleUrl && mappingRuleResource;
		if (hasIndividual) {
			// Ensure required individual parts are present
			try {
				// Validate resource format
				if (!/^[A-Za-z0-9\-_]+$/.test(mappingRuleResource)) {
					throw new Error(
						`Invalid resource "${mappingRuleResource}". Must match /^[A-Za-z0-9\\-_]+$/.`,
					);
				}

				// Build headers object from array of "Key:Value" strings
				let hdrs: Record<string, string> = {};
				if (Array.isArray(mappingRuleHeaders)) {
					mappingRuleHeaders.forEach((h: string) => {
						const [k, v] = h.split(':');
						if (k && v) hdrs[k.trim()] = v.trim();
					});
				}

				const rule: MappingRuleType = {
					http_method:
						mappingRuleMethod.toLowerCase() as MappingRuleType['http_method'],
					url: mappingRuleUrl,
					resource: mappingRuleResource,
					action: mappingRuleAction,
					priority: mappingRulePriority,
					headers: hdrs,
					url_type:
						mappingRuleUrlType === 'regex' ? mappingRuleUrlType : undefined,
				};

				// Push the individual rule into the mapping_rules array
				mapping_rules = [...mapping_rules, rule];
			} catch (err) {
				parseError = err instanceof Error ? err.message : String(err);
			}
		}

		const payload: ProxyConfigOptions = {
			key: options.key || '',
			secret: options.secret || '',
			name: options.name || '',
			mapping_rules,
			auth_mechanism: options.authMechanism || 'Bearer',
		};

		return {
			payload,
			parseError,
			updatePayloadKey: (newKey: string) => {
				payload.key = newKey;
			},
		};
	}, [options]);
}

export default useParseProxyData;
