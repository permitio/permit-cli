import { useMemo } from 'react';
import { components } from '../lib/api/v1.js';

export function useParseResources(
	resourceStrings?: string[],
): components['schemas']['ResourceCreate'][] {
	return useMemo(() => {
		if (!resourceStrings || resourceStrings.length === 0) return [];

		try {
			return resourceStrings.map(resource => {
				// Split resource definition into key and attributes
				const [mainPart, attributesPart] = resource
					.split('@')
					.map(s => s.trim());

				if (!mainPart) {
					throw new Error('Invalid resource format');
				}

				// Split main part into key and name/description
				const [key, name] = mainPart.split(':').map(s => s.trim());

				if (!key) {
					throw new Error(`Invalid resource key in: ${resource}`);
				}

				// Process attributes if they exist
				const attributes = attributesPart
					? attributesPart.split(',').reduce(
							(acc, attr) => {
								const attrKey = attr.trim();
								if (attrKey) {
									acc[attrKey] = {} as never;
								}
								return acc;
							},
							{} as Record<string, never>,
						)
					: undefined;

				return {
					key,
					name: name || key,
					description: name || undefined,
					attributes,
					actions: {},
				};
			});
		} catch (err) {
			throw new Error(
				`Invalid resource format. Expected ["key:name@attribute1,attribute2"], got ${JSON.stringify(resourceStrings) + err}`,
			);
		}
	}, [resourceStrings]);
}
