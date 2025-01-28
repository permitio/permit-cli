{{#each roles}}
resource "permitio_role" "{{key}}" {
  key         = "{{key}}"
  name        = "{{name}}"
  {{#if resource}}
  resource    = permitio_resource.{{resource}}.key
  {{/if}}
  {{#if permissions}}
  permissions = {{{json permissions}}}
  {{/if}}
  {{#if description}}
  description = "{{description}}"
  {{/if}}
  {{#if dependencies}}
  depends_on  = {{{json dependencies}}}
  {{/if}}
}
{{/each}}