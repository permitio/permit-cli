import { PolicyData } from './types.js';
import { getPermitApiUrl } from '../../../config.js';

interface TerraformGeneratorProps {
	tableData: PolicyData;
	authToken: string;
	onTerraformGenerated: (terraform: string) => void;
}

export const generateTerraform = ({
	tableData,
	authToken,
	onTerraformGenerated,
}: TerraformGeneratorProps) => {
	if (!tableData) return;

	const { resources, roles } = tableData;

	// Convert resource names to keys (lowercase, no spaces)
	const resourceKeys = resources.map(r => ({
		...r,
		key: r.name.toLowerCase().replace(/\s+/g, '_'),
	}));

	// Convert role names to keys
	const roleKeys = roles.map(r => ({
		...r,
		key: r.name.toLowerCase().replace(/\s+/g, '_'),
	}));

	const terraform = `terraform {
  required_providers {
    permitio = {
      source  = "registry.terraform.io/permitio/permit-io"
      version = "~> 0.0.14"
    }
  }
}

provider "permitio" {
  api_url = "${getPermitApiUrl()}"
  api_key = "${authToken}"
}

${resourceKeys
	.map(
		r => `resource "permitio_resource" "${r.key}" {
  key         = "${r.key}"
  name        = "${r.name}"
  description = "${r.name} resource"
  attributes  = {}
  actions     = {
    ${r.actions.map(a => `"${a.toLowerCase()}" : { "name" : "${a.charAt(0).toUpperCase() + a.slice(1)}" }`).join(',\n    ')}
  }
}`,
	)
	.join('\n\n')}

${roleKeys
	.map(
		r => `resource "permitio_role" "${r.key}" {
  key         = "${r.key}"
  name        = "${r.name}"
  description = "${r.name} role"
  permissions = [
    ${r.permissions
			.flatMap(p => p.actions.map(a => `"${p.resource.toLowerCase()}:${a}"`))
			.join(',\n    ')}
  ]
  depends_on = [
    ${r.permissions
			.map(
				p =>
					`permitio_resource.${p.resource.toLowerCase().replace(/\s+/g, '_')}`,
			)
			.join(',\n    ')}
  ]
}`,
	)
	.join('\n\n')}
`;

	onTerraformGenerated(terraform);
};
