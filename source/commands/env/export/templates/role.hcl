{{#each roles}}
resource "permitio_role" "{{terraformId}}" {
  key         = "{{key}}"
  name        = "{{name}}"
{{#if resource}}
  resource    = permitio_resource.{{resource}}.key
{{/if}}
{{#if permissions.length}}
  permissions = [{{#each permissions}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}]
{{/if}}
{{#if description}}
  description = "{{description}}"
{{/if}}
{{#if extends.length}}
  extends = {{json extends}}
{{/if}}
{{attributes attributes}}
{{#if dependencies.length}}
  depends_on  = [{{#each dependencies}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}]
{{/if}}
}
{{/each}}