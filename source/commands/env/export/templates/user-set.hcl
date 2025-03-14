{{#each sets}}
resource "permitio_user_set" "{{key}}" {
  key = "{{key}}"
  name = "{{name}}"
  conditions = jsonencode({{{formatConditions conditions}}})
{{#if resource}}
  resource = "{{resource}}"
{{/if}}
{{#if depends_on.length}}
  depends_on = [
    {{#each depends_on}}
    {{this}}{{#unless @last}},{{/unless}}
    {{/each}}
  ]
{{/if}}
}
{{/each}}