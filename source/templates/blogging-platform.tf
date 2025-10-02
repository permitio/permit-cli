terraform {
  required_providers {
    permitio = {
      source = "permitio/permit-io"
      version = "~> 0.0.12"
    }
  }
}

provider "permitio" {
  api_url = {{API_URL}}
  api_key = {{API_KEY}}
}

# Resources
resource "permitio_resource" "Comment" {
  name        = "Comment"
  description = ""
  key         = "Comment"

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
  }
}
resource "permitio_resource" "Post" {
  name        = "Post"
  description = ""
  key         = "Post"

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
      type = "bool"
    }
  }
}

# Roles
resource "permitio_role" "Comment__Author" {
  key         = "Author"
  name        = "Author"
  resource    = permitio_resource.Comment.key
  permissions = ["create", "read"]

  depends_on  = [permitio_resource.Comment]
}
resource "permitio_role" "Moderator" {
  key         = "Moderator"
  name        = "Moderator"
  resource    = permitio_resource.Comment.key
  permissions = ["update", "create", "delete", "read"]

  depends_on  = [permitio_resource.Comment]
}
resource "permitio_role" "Post__Author" {
  key         = "Author"
  name        = "Author"
  resource    = permitio_resource.Post.key
  permissions = ["update", "read", "create", "delete"]

  depends_on  = [permitio_resource.Post]
}
resource "permitio_role" "Admin" {
  key         = "Admin"
  name        = "Admin"
  permissions = ["Post:read", "Comment:create", "Post:update", "Post:create", "Post:delete", "Comment:update", "Comment:read", "Comment:delete"]

  depends_on  = [permitio_resource.Post, permitio_resource.Comment]
}
resource "permitio_role" "Reader" {
  key         = "Reader"
  name        = "Reader"
  permissions = ["Comment:create", "Comment:read"]

  depends_on  = [permitio_resource.Comment]
}
resource "permitio_role" "Author" {
  key         = "Author"
  name        = "Author"
  permissions = ["Comment:read", "Post:read", "Post:create"]

  depends_on  = [permitio_resource.Comment, permitio_resource.Post]
}
resource "permitio_role" "PremiumReader" {
  key         = "PremiumReader"
  name        = "Premium Reader"
  permissions = ["Comment:read", "Post:read"]

  depends_on  = [permitio_resource.Comment, permitio_resource.Post]
}

# Relations
resource "permitio_relation" "Post_Comment" {
  key              = "parent"
  name             = "parent"
  subject_resource = permitio_resource.Post.key
  object_resource  = permitio_resource.Comment.key
  depends_on = [
    permitio_resource.Comment,
    permitio_resource.Post,
  ]
}

# Resource Sets
resource "permitio_resource_set" "Free_Post" {
  name        = "Free Post"
  key         = "Free_Post"
  resource    = permitio_resource.Post.key
  conditions  = jsonencode({
  "allOf": [
    {
      "allOf": [
        {
          "resource.premium": {
            "equals": false
          }
        }
      ]
    }
  ]
})
  depends_on  = [
    permitio_resource.Post
  ]
}

# Role Derivations
resource "permitio_role_derivation" "Post_Author_to_Comment_Moderator" {
  role        = permitio_role.Post__Author.key
  on_resource = permitio_resource.Post.key
  to_role     = permitio_role.Moderator.key
  resource    = permitio_resource.Comment.key
  linked_by   = permitio_relation.Post_Comment.key
  depends_on = [
    permitio_role.Post__Author,
    permitio_resource.Post,
    permitio_role.Moderator,
    permitio_resource.Comment,
    permitio_relation.Post_Comment
  ]
}


resource "permitio_condition_set_rule" "allow_member_to_make_changes_in_region" {
  user_set     = "Reader"
  resource_set = "Free_Post"
  permission   = "Post:read"
  depends_on   = [permitio_role.Reader, permitio_resource_set.Free_Post]
}