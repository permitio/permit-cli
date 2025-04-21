import { components } from '../lib/api/v1.js';

export function useParseActions(
	actionStrings?: string[],
): Record<string, components['schemas']['ActionBlockEditable']> {
	if (!actionStrings || actionStrings.length === 0) return {};

	try {
		return actionStrings.reduce(
			(acc, action) => {
				// Split action definition into main part and attributes part
				const [mainPart, attributesPart] = action.split('@').map(s => s.trim());

				if (!mainPart) {
					throw new Error('Invalid action format');
				}

				// Split main part into key and description
				const [key, description] = mainPart.split(':').map(s => s.trim());

				if (!key) {
					throw new Error(`Invalid action key in: ${action}`);
				}

				// Process attributes if they exist
				const attributes = attributesPart
					? attributesPart.split(',').reduce(
							(attrAcc, attr) => {
								const attrKey = attr.trim();
								if (attrKey) {
									attrAcc[attrKey] = {} as never;
								}
								return attrAcc;
							},
							{} as Record<string, never>,
						)
					: undefined;

				acc[key] = {
					name: key,
					description: description || undefined,
					attributes: attributes,
				};

				return acc;
			},
			{} as Record<string, components['schemas']['ActionBlockEditable']>,
		);
	} catch (err) {
		throw new Error(
			`Invalid action format. Expected ["key:description@attribute1,attribute2"], got ${JSON.stringify(actionStrings) + err}`,
		);
	}
}
