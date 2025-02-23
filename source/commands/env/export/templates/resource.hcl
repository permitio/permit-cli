{{#each resources}}
resource "permitio_resource" "{{key}}" {
  name        = "{{name}}"
  description = "{{description}}"
  key         = "{{key}}"

  actions = {
    {{#each actions}}
    "{{@key}}" = {
      name = "{{name}}"{{#if description}}
      description = "{{description}}"{{/if}}
    }{{#unless @last}},{{/unless}}
    {{/each}}
  }
  {{#if attributes}}
  attributes = {
    {{#each attributes}}
    "{{@key}}" = {
      name = "{{name}}"
      type = "{{type}}"{{#if required}}
      required = {{required}}{{/if}}
    }{{#unless @last}},{{/unless}}
    {{/each}}
  }
  {{/if}}
}
{{/each}}