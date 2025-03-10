{{#each sets}}
resource "permitio_resource_set" "{{key}}" {
  name        = "{{name}}"
  key         = "{{key}}"
  resource    = permitio_resource.{{resource}}.key
  conditions  = {{{conditions}}}
  depends_on  = [
    {{#each depends_on}}
    {{this}}{{#unless @last}},{{/unless}}
    {{/each}}
  ]
}
{{/each}}