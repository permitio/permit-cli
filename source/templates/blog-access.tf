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
resource "permitio_resource" "docs" {
  name        = "docs"
  description = ""
  key         = "docs"

  actions = {
    "delete" = {
      name = "delete"
    },
    "update" = {
      name = "update"
    },
    "create" = {
      name = "create"
    }
  }
  attributes = {
  }
}
resource "permitio_resource" "blog" {
  name        = "blog"
  description = ""
  key         = "blog"

  actions = {
    "delete" = {
      name = "delete"
    },
    "update" = {
      name = "update"
    },
    "read" = {
      name = "read"
    },
    "create" = {
      name = "create"
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
resource "permitio_role" "docs__editor" {
  key         = "editor"
  name        = "editor"
  resource    = permitio_resource.docs.key
  permissions = ["update", "delete", "create"]

  depends_on  = [permitio_resource.docs]
}
resource "permitio_role" "reader" {
  key         = "reader"
  name        = "reader"
  permissions = ["blog:read"]

  depends_on  = [permitio_resource.blog]
}

# Relations
resource "permitio_relation" "blog_docs" {
  key              = "parent"
  name             = "parent"
  subject_resource = permitio_resource.blog.key
  object_resource  = permitio_resource.docs.key
  depends_on = [
    permitio_resource.docs,
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
resource "permitio_role_derivation" "blog_editor_to_docs_editor" {
  role        = permitio_role.blog__editor.key
  on_resource = permitio_resource.blog.key
  to_role     = permitio_role.docs__editor.key
  resource    = permitio_resource.docs.key
  linked_by   = permitio_relation.blog_docs.key
  depends_on = [
    permitio_role.blog__editor,
    permitio_resource.blog,
    permitio_role.docs__editor,
    permitio_resource.docs,
    permitio_relation.blog_docs
  ]
