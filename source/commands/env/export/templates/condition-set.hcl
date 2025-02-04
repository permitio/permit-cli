{{#each rules}}
resource "permitio_condition_set_rule" "{{key}}" {
  user_set     = permitio_role.{{userSet}}.key
  resource_set = permitio_resource_set.{{resourceSet}}.key
  permission   = "{{permission}}"
  depends_on   = [
    permitio_resource_set.{{resourceSet}}, 
    permitio_role.{{userSet}}
  ]
}
{{/each}}