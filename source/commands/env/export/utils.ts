import { WarningCollector } from './types.js';

export function createSafeId(...parts: string[]): string {
	return parts
		.map(part => (part || '').replace(/[^a-zA-Z0-9_]/g, '_'))
		.filter(Boolean)
		.join('_');
}

export function createWarningCollector(): WarningCollector {
	const warnings: string[] = [];

	return {
		addWarning(warning: string) {
			warnings.push(warning);
		},
		getWarnings() {
			return warnings;
		},
	};
}

export const generateProviderBlock = (key: string) => `
terraform {
  required_providers {
    permitio = {
      source = "permitio/permit-io"
      version = "~> 0.1.0"
    }
  }
}

provider "permitio" {
  api_key = "${key}"
}
`;
