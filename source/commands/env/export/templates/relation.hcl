{{#each relations}}
resource "permitio_relation" "{{key}}" {
  key = "{{key}}"
  name = "{{name}}"
  {{#if description}}
  description = "{{description}}"
  {{/if}}
  subject_resource = "{{subject_resource}}"
  object_resource = "{{object_resource}}"

  depends_on = [
    permitio_resource.{{subject_resource}},
    permitio_resource.{{object_resource}}
  ]
}
{{/each}}