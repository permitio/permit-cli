// source/utils/attributes.ts

class AttributeParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AttributeParseError';
	}
}

export function parseAttributes(
	attrString: string,
): Record<string, string | number | boolean> {
	if (!attrString || attrString.trim() === '') {
		return {};
	}

	const attributes: Record<string, string | number | boolean> = {};

	const pairs = attrString.split(',');
	for (const pair of pairs) {
		const parts = pair.split(':');

		// Validate the pair format
		if (parts.length !== 2) {
			throw new AttributeParseError(
				`Invalid attribute format: "${pair}". Expected format "key:value"`,
			);
		}

		const [key, value] = parts.map(s => s.trim());

		// Validate key
		if (!key) {
			throw new AttributeParseError('Attribute key cannot be empty');
		}

		// Validate value
		if (value === undefined || value === '') {
			throw new AttributeParseError(`Value for key "${key}" cannot be empty`);
		}

		// Parse the value into appropriate type
		try {
			if (value.toLowerCase() === 'true') {
				attributes[key] = true;
			} else if (value.toLowerCase() === 'false') {
				attributes[key] = false;
			} else if (!isNaN(Number(value)) && value.trim() !== '') {
				attributes[key] = Number(value);
			} else {
				attributes[key] = value;
			}
		} catch (error) {
			throw new AttributeParseError(
				`Failed to parse value for key "${key}": ${(error as Error).message}`,
			);
		}
	}

	return attributes;
}
