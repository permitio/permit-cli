// File: hooks/useParseProxyData.ts

import { useMemo } from 'react';
import { type infer as zType } from 'zod';
import { options as originalOptions } from '../commands/api/create/proxy.js';
import { ProxyConfigOptions } from '../utils/api/proxy/createutils.js';

type CreateProxyOptions = zType<typeof originalOptions>;

// Use NonNullable to ensure we return an element of the array (not undefined).
type MappingRuleType = NonNullable<ProxyConfigOptions['mapping_rules']>[number];

/**
 * Parses a mapping rule string into a full mapping rule object.
 * Expected format: "url|http_method|[resource]|[headers]|[action]|[priority]"
 */
function parseMappingRule(ruleStr: string, index: number): MappingRuleType {
	// Split the string by pipe and trim each part.
	const parts = ruleStr.split('|').map(s => s.trim());

	// Ensure that both URL and HTTP method are provided.
	if (!parts[0] || !parts[1]) {
		throw new Error(
			`Mapping rule at index ${index} must include at least "url" and "http_method".`,
		);
	}

	// Use non-null assertion for the required fields.
	const url: string = parts[0]!;
	const httpMethod: string = parts[1]!; // We already checked it's truthy.

	// For optional parts, supply defaults.
	const resource: string = parts[2] ?? '';
	const headersStr: string = parts[3] ?? '{}';
	const action: string | undefined = parts[4] ? parts[4] : undefined;
	const priorityStr: string | undefined = parts[5] ? parts[5] : undefined;

	// Parse headers (if the string is valid JSON, otherwise default to an empty object).
	let headers: Record<string, string> = {};
	try {
		headers = JSON.parse(headersStr);
	} catch {
		headers = {};
	}

	let priority: number | undefined;
	if (priorityStr) {
		priority = Number(priorityStr);
		if (Number.isNaN(priority)) {
			priority = undefined;
		}
	}

	return {
		url,
		http_method: httpMethod.toLowerCase() as MappingRuleType['http_method'],
		resource,
		headers,
		action,
		priority,
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

export function useParseProxyData(options: CreateProxyOptions): {
	payload: ProxyConfigOptions;
	parseError: string | null;
	updatePayloadKey: (newKey: string) => void;
} {
	return useMemo(() => {
		let parseError: string | null = null;
		let mapping_rules: ProxyConfigOptions['mapping_rules'] = [];

		// Parse the mappingRules provided as an array of strings.
		if (options.mapping_rules) {
			try {
				mapping_rules = parseMappingRules(options.mapping_rules);
			} catch (err) {
				parseError = err instanceof Error ? err.message : String(err);
			}
		}

		// Build the final payload object. Use default values for missing fields.
		const payload: ProxyConfigOptions = {
			key: options.key || '',
			secret: options.secret || '',
			name: options.name || '',
			mapping_rules,
			auth_mechanism: options.authMechanism ? options.authMechanism : 'Bearer',
		};

		return {
			payload,
			parseError,
			updatePayloadKey: (newKey: string) => {
				payload.key = newKey;
			},
		};
	}, [
		options.key,
		options.secret,
		options.name,
		options.mapping_rules,
		options.authMechanism,
	]);
}

export default useParseProxyData;
