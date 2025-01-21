{{#each sets}}
resource "permitio_user_set" "{{key}}" {
  name        = "{{name}}"
  key         = "{{key}}"
  {{#if description}}
  description = "{{description}}"
  {{/if}}
  conditions  = {{{conditions}}}
  {{#if resource}}
  resource    = permitio_resource.{{resource}}.key
  depends_on  = [
    permitio_resource.{{resource}}
  ]
  {{/if}}
}
{{/each}}