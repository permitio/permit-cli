{{#each derivations}}
resource "permitio_role_derivation" "{{resource_id}}" {
  resource    = "{{resource}}"
  role        = "{{role}}"
  linked_by   = "{{linked_by}}"
  on_resource = "{{on_resource}}"
  to_role     = "{{to_role}}"
  {{#if dependencies}}
  depends_on  = [{{{json dependencies}}}]
  {{/if}}
}
{{/each}}