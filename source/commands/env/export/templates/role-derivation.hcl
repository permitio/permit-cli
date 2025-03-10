{{#each derivations}}
resource "permitio_role_derivation" "{{id}}" {
  role        = permitio_role.{{role}}.key
  on_resource = permitio_resource.{{on_resource}}.key
  to_role     = permitio_role.{{to_role}}.key
  resource    = permitio_resource.{{resource}}.key
  linked_by   = permitio_relation.{{linked_by}}.key
  depends_on = [
    {{#each dependencies}}
    {{this}}{{#unless @last}},{{/unless}}
    {{/each}}
  ]
}
{{/each}}