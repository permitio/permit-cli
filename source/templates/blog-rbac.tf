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
  description = "Blog resource for managing blog posts"
  key         = "blog"

  actions = {
    "read" = {
      name = "read"
    },
    "create" = {
      name = "create"
    },
    "update" = {
      name = "update"
    },
    "delete" = {
      name = "delete"
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
resource "permitio_role" "reader" {
  key         = "reader"
  name        = "reader"
  permissions = ["blog:read"]

  depends_on  = [permitio_resource.blog]
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

