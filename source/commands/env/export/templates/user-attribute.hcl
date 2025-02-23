{{#each attributes}}
resource "permitio_user_attribute" "{{resourceKey}}" {
  key         = "{{key}}"
  type        = "{{type}}"
  {{#if description}}
  description = "{{formatDescription description}}"
  {{/if}}
}
{{/each}}