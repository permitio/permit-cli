terraform {
  required_providers {
    permitio = {
      source = "permitio/permit-io"
      version = "~> 0.0.14"
    }
  }
}

provider "permitio" {
  api_url = {{API_URL}}
  api_key = {{API_KEY}}
}

# Resources
resource "permitio_resource" "comment" {
  name        = "comment"
  description = "resource for managing access to post comments"
  key         = "comment"

  actions = {
    "create" = {
      name = "create"
    },
    "update" = {
      name = "update"
    },
    "delete" = {
      name = "delete"
    },
    "read" = {
      name = "read"
    }
  }
  attributes = {
  }
}
resource "permitio_resource" "post" {
  name        = "post"
  description = "resource representing a post entity and its access actions" 
  key         = "post"

  actions = {
    "delete" = {
      name = "delete"
    },
    "create" = {
      name = "create"
    },
    "update" = {
      name = "update"
    },
    "read" = {
      name = "read"
    }
  }
  attributes = {
    "premium" = {
      name = "Premium"
      type = "string"
    }
  }
}

# Roles
resource "permitio_role" "comment__editor" {
  key         = "editor"
  name        = "editor"
  resource    = permitio_resource.comment.key
  permissions = ["update", "create", "read"]

  depends_on  = [permitio_resource.comment]
}
resource "permitio_role" "post__admin" {
  key         = "admin"
  name        = "admin"
  resource    = permitio_resource.post.key
  permissions = ["update", "delete", "create", "read"]

  depends_on  = [permitio_resource.post]
}
resource "permitio_role" "post__editor" {
  key         = "editor"
  name        = "editor"
  resource    = permitio_resource.post.key
  permissions = ["create", "read", "update"]

  depends_on  = [permitio_resource.post]
}
resource "permitio_role" "reader" {
  key         = "reader"
  name        = "reader"
  permissions = ["post:read"]

  depends_on  = [permitio_resource.post]
}

# Relations
resource "permitio_relation" "post_comment" {
  key              = "parent"
  name             = "parent"
  subject_resource = permitio_resource.post.key
  object_resource  = permitio_resource.comment.key
  depends_on = [
    permitio_resource.comment,
    permitio_resource.post,
  ]
}

# Resource Sets
resource "permitio_resource_set" "premium" {
  name        = "premium"
  key         = "premium"
  resource    = permitio_resource.post.key
  conditions  = jsonencode({
  "allOf": [
    {
      "allOf": [
        {
          "resource.premium": {
            "equals": "true"
          }
        }
      ]
    }
  ]
})
  depends_on  = [
    permitio_resource.post
  ]
}

# Role Derivations
resource "permitio_role_derivation" "post_editor_to_comment_editor" {
  role        = permitio_role.post__editor.key
  on_resource = permitio_resource.post.key
  to_role     = permitio_role.comment__editor.key
  resource    = permitio_resource.comment.key
  linked_by   = permitio_relation.post_comment.key
  depends_on = [
    permitio_role.post__editor,
    permitio_resource.post,
    permitio_role.comment__editor,
    permitio_resource.comment,
    permitio_relation.post_comment
  ]
}
