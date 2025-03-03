{{#each sets}}
resource "permitio_user_set" "{{key}}" {
  key = "{{key}}"
  name = "{{name}}"
  {{#if description}}
  description = "{{description}}"
  {{/if}}
  {{#if resource}}
  resource = "{{resource}}"
  {{/if}}
  conditions = jsonencode({{{formatConditions conditions}}})
  {{#if depends_on.length}}
  depends_on = [
    {{#each depends_on}}
    {{this}}{{#unless @last}},{{/unless}}
    {{/each}}
  ]
  {{/if}}
}
{{/each}}