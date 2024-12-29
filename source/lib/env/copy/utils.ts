export function cleanKey(key: string): string {
	// Replace spaces with underscores and remove special characters
	return key.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
}
