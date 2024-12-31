{{#each conditionSets}}
resource "permitio_{{resourceType}}" "{{key}}" {
  key = "{{key}}"
  name = "{{name}}"
  {{#if description}}
  description = "{{description}}"
  {{/if}}
  conditions = {{conditions}}
  {{#if resource}}
  resource = "{{resource}}"
  {{/if}}
}
{{/each}}