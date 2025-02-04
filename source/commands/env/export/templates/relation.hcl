{{#each relations}}
resource "permitio_relation" "{{resource_name}}" {
  key              = "{{key}}"
  name             = "{{noEscape name}}"
  {{#if description}}
  description      = "{{noEscape description}}"
  {{/if}}
  subject_resource = {{subject_resource_key}}
  object_resource  = {{object_resource_key}}
  depends_on = [
    {{#each depends_on}}{{this}}{{#unless @last}},
    {{/unless}}{{/each}}
  ]
}
{{/each}}