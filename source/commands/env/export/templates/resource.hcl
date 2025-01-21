{{#each resources}}
resource "permitio_resource" "{{key}}" {
  name        = "{{name}}"
  description = "{{description}}"
  key         = "{{key}}"
  
  actions = {
    {{#each actions}}
    "{{@key}}" = {
      name = "{{name}}"
      {{#if description}}description = "{{description}}"{{/if}}
    }{{#unless @last}},{{/unless}}
    {{/each}}
  }

  {{#if attributes}}
  attributes = {
    {{#each attributes}}
    {{@key}} = {
      name = "{{name}}"
      type = "{{type}}"
    }{{#unless @last}},{{/unless}}
    {{/each}}
  }
  {{/if}}

  {{#if depends_on}}
  depends_on = [
    {{#each depends_on}}
    "{{this}}"{{#unless @last}},{{/unless}}
    {{/each}}
  ]
  {{/if}}
}
{{/each}}