{{#each roles}}
resource "permitio_role" "{{key}}" {
  key  = "{{key}}"
  name = "{{name}}"
  {{#if permissions}}
  permissions = {{{json permissions}}}
  {{/if}}
  {{#if dependencies}}
  depends_on = [{{{json dependencies}}}]
  {{/if}}
}
{{/each}}