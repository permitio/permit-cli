{{#each attributes}}
resource "permitio_user_attribute" "{{resourceKey}}" {
  key         = "{{key}}"
  type        = "{{type}}"
  description = "{{formatDescription description}}"
}
{{/each}}