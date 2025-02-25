{{#each relations}}
resource "permitio_relation" "{{relation_id}}" {
  key              = "{{key}}"
  name             = "{{{name}}}"
  subject_resource = {{subject_resource_ref}}
  object_resource  = {{object_resource_ref}}
  depends_on = [
{{#each dependencies}}
    {{this}},
{{/each}}
  ]
}
{{/each}}