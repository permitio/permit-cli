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

export const generateProviderBlock = () => `
terraform {
  required_providers {
    permitio = {
      source = "permitio/permit-io"
      version = "~> 0.0.12"
    }
  }
}

variable "PERMIT_API_KEY" {
  type        = string
  description = "The API key for the Permit.io API"
}

provider "permitio" {
  api_url = "https://api.permit.io"
  api_key = var.PERMIT_API_KEY
}
`;
