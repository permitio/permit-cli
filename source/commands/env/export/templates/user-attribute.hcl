{{#each attributes}}
resource "permitio_user_attribute" "{{key}}" {
  key = "{{key}}"
  type = "{{type}}"
  {{#if description}}
  description = "{{description}}"
  {{/if}}
}
{{/each}}