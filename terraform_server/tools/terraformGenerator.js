function generateTerraformConfig(resourceKeys, roleKeys) {
	return `terraform {
  required_providers {
    permitio = {
      source  = "registry.terraform.io/permitio/permit-io"
      version = "~> 0.0.14"
    }
  }
}

provider "permitio" {
  api_url = "https://api.permit.io"
  api_key = "" // Set this to Permit.io API key
}

${resourceKeys.map(r => `resource "permitio_resource" "${r.key}" {
  key         = "${r.key}"
  name        = "${r.name}"
  description = "${r.name} resource"
  attributes  = {}
  actions     = {
    ${r.actions.map(a => `"${a.toLowerCase()}" : { "name" : "${a.charAt(0).toUpperCase() + a.slice(1)}" }`).join(',\n    ')}
  }
}`).join('\n\n')}

${roleKeys.map(r => `resource "permitio_role" "${r.key}" {
  key         = "${r.key}"
  name        = "${r.name}"
  description = "${r.name} role"
  permissions = [
    ${r.permissions.flatMap(p => 
      p.actions.map(action => `"${p.resource.toLowerCase()}:${action}"`)
    ).join(',\n    ')}
  ]
}`).join('\n\n')}`;
}

export { generateTerraformConfig }; 