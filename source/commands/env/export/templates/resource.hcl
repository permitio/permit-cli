{{#each resources}}
resource "permitio_resource" "{{key}}" {
  key         = "{{key}}"
  name        = "{{name}}"
  {{#if description}}
  description = "{{description}}"
  {{/if}}
  {{#if urn}}
  urn         = "{{urn}}"
  {{/if}}

  {{#if actions}}
  actions = {
    {{#each actions}}
    "{{@key}}" = {
      name = "{{name}}"
      {{#if description}}
      description = "{{description}}"
      {{/if}}
    }
    {{/each}}
  }
  {{/if}}

  {{#if attributes}}
  attributes = {
    {{#each attributes}}
    "{{@key}}" = {
      type = "{{type}}"
      {{#if description}}
      description = "{{description}}"
      {{/if}}
    }
    {{/each}}
  }
  {{/if}}
}
{{/each}}