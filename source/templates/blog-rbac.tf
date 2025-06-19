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

# User Sets
resource "permitio_user_set" "permit_employee" {
  key = "permit_employee"
  name = "permit-employee"
  conditions = jsonencode({
  allOf = [
    {
      allOf = [
        {
          "user.email" = {
            contains = "permit.io"
          }
        }
      ]
    }
  ]
})
}
