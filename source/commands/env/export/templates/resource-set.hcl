{{#each sets}}
resource "permitio_resource_set" "{{key}}" {
  key = "{{key}}"
  name = "{{name}}"
  {{#if description}}
  description = "{{description}}"
  {{/if}}
  {{#if resource}}
  resource = "{{resource}}"
  {{/if}}
  conditions = "{{conditions}}"
}
{{/each}}