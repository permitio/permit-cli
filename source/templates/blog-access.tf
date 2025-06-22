terraform {
  required_providers {
    permitio = {
      source = "permitio/permit-io"
      version = "~> 0.0.14"
    }
  }
}

variable "PERMIT_API_KEY" {
  type        = string
  description = "The API key for the Permit.io API"
}

provider "permitio" {
  api_url = "https://api.permit.io"
  api_key = {{API_KEY}}
}

# Resources
resource "permitio_resource" "blog" {
  name        = "blog"
  description = ""
  key         = "blog"

  actions = {
    "create" = {
      name = "create"
    },
    "delete" = {
      name = "delete"
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
resource "permitio_resource" "comment" {
  name        = "comment"
  description = ""
  key         = "comment"

  actions = {
    "read" = {
      name = "read"
    },
    "create" = {
      name = "create"
    },
    "delete" = {
      name = "delete"
    },
    "update" = {
      name = "update"
    }
  }
  attributes = {
  }
}

# Roles
resource "permitio_role" "blog__admin" {
  key         = "admin"
  name        = "admin"
  resource    = permitio_resource.blog.key
  permissions = ["update", "delete", "create", "read"]

  depends_on  = [permitio_resource.blog]
}
resource "permitio_role" "blog__editor" {
  key         = "editor"
  name        = "editor"
  resource    = permitio_resource.blog.key
  permissions = ["read", "create", "update"]

  depends_on  = [permitio_resource.blog]
}
resource "permitio_role" "blog__reader" {
  key         = "reader"
  name        = "reader"
  resource    = permitio_resource.blog.key
  permissions = ["read"]

  depends_on  = [permitio_resource.blog]
}
resource "permitio_role" "comment__editor" {
  key         = "editor"
  name        = "editor"
  resource    = permitio_resource.comment.key
  permissions = ["read"]

  depends_on  = [permitio_resource.comment]
}
resource "permitio_role" "comment__admin" {
  key         = "admin"
  name        = "admin"
  resource    = permitio_resource.comment.key
  permissions = ["read", "update", "create", "delete"]

  depends_on  = [permitio_resource.comment]
}
resource "permitio_role" "reader" {
  key         = "reader"
  name        = "reader"
  permissions = ["blog:read"]

  depends_on  = [permitio_resource.blog]
}

# Relations
resource "permitio_relation" "blog_comment" {
  key              = "parent"
  name             = "parent"
  subject_resource = permitio_resource.blog.key
  object_resource  = permitio_resource.comment.key
  depends_on = [
    permitio_resource.comment,
    permitio_resource.blog,
  ]
}

# Condition Set Rules
resource "permitio_condition_set_rule" "free_premium_premium_blog_read" {
  user_set     = permitio_user_set.free_premium.key
  permission   = "blog:read"
  resource_set = permitio_resource_set.premium.key
  depends_on   = [
    permitio_resource_set.premium,
    permitio_user_set.free_premium
  ]
}

# Resource Sets
resource "permitio_resource_set" "premium" {
  name        = "premium"
  key         = "premium"
  resource    = permitio_resource.blog.key
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
    permitio_resource.blog
  ]
}

# User Sets
resource "permitio_user_set" "free_premium" {
  key = "free_premium"
  name = "free-premium"
  conditions = jsonencode({
  allOf = [
    {
      allOf = [
        {
          "user.email" = {
            equals = "un.org"
          }
        },
        {
          "user.email" = {
            equals = "who.org"
          }
        }
      ]
    }
  ]
})
}

# Role Derivations
resource "permitio_role_derivation" "blog_admin_to_comment_admin" {
  role        = permitio_role.blog__admin.key
  on_resource = permitio_resource.blog.key
  to_role     = permitio_role.comment__admin.key
  resource    = permitio_resource.comment.key
  linked_by   = permitio_relation.blog_comment.key
  depends_on = [
    permitio_role.blog__admin,
    permitio_resource.blog,
    permitio_role.comment__admin,
    permitio_resource.comment,
    permitio_relation.blog_comment
  ]
}
