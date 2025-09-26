terraform {
  required_providers {
    permitio = {
      source = "permitio/permit-io"
      version = "~> 0.0.12"
    }
  }
}

variable "PERMIT_API_KEY" {
  type        = string
  description = "The API key for the Permit.io API"
}

provider "permitio" {
  api_url = "https://api.permit.io"
  api_key = var.PERMIT_API_KEY
}

# Resources
resource "permitio_resource" "Comment" {
  name        = "Comment"
  description = ""
  key         = "Comment"

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
  }
}
resource "permitio_resource" "Category" {
  name        = "Category"
  description = ""                                                                                   key         = "Category"

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
  }
}
resource "permitio_resource" "Article" {
  name        = "Article"
  description = ""
  key         = "Article"

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
    },
    "publish" = {
      name = "publish"
    }
  }
  attributes = {
    "category" = {
      name = "Category"
      type = "string"
    }
  }
}

# User Attributes
resource "permitio_user_attribute" "user_created_at" {
  key         = "created_at"
  type        = "string"
  description = ""
}
resource "permitio_user_attribute" "user_last_active" {
  key         = "last_active"
  type        = "string"
  description = ""
}
resource "permitio_user_attribute" "user_subscription_tier" {
  key         = "subscription_tier"
  type        = "string"
  description = ""
}

# Roles
resource "permitio_role" "author" {
  key         = "author"
  name        = "author"
  permissions = ["Comment:create", "Article:read", "Comment:read", "Comment:update",
"Article:create", "Article:update", "Category:read"]

  depends_on  = [permitio_resource.Comment, permitio_resource.Article, permitio_resource.Category]
}

# Condition Set Rules
resource "permitio_condition_set_rule" "premium_subscribers_regular_articles_Article_read" {
  user_set     = permitio_user_set.premium_subscribers.key
  permission   = "Article:read"
  resource_set = permitio_resource_set.regular_articles.key
  depends_on   = [
    permitio_resource_set.regular_articles,
    permitio_user_set.premium_subscribers
  ]
}
resource "permitio_condition_set_rule" "premium_subscribers_premium_articles_Article_read" {
  user_set     = permitio_user_set.premium_subscribers.key
  permission   = "Article:read"
  resource_set = permitio_resource_set.premium_articles.key
  depends_on   = [
    permitio_resource_set.premium_articles,
    permitio_user_set.premium_subscribers
  ]
}
resource "permitio_condition_set_rule" "free_subscribers_regular_articles_Article_read" {
  user_set     = permitio_user_set.free_subscribers.key
  permission   = "Article:read"
  resource_set = permitio_resource_set.regular_articles.key
  depends_on   = [
    permitio_resource_set.regular_articles,
    permitio_user_set.free_subscribers
  ]
}

# Resource Sets
resource "permitio_resource_set" "premium_articles" {
  name        = "Premium Articles"
  key         = "premium_articles"
  resource    = permitio_resource.Article.key
  conditions  = jsonencode({
  "allOf": [
    {
      "allOf": [
        {
          "resource.category": {
            "equals": "premium"
          }
        }
      ]
    }
  ]
})
  depends_on  = [
    permitio_resource.Article
  ]
}
resource "permitio_resource_set" "regular_articles" {
  name        = "Regular Articles"
  key         = "regular_articles"
  resource    = permitio_resource.Article.key
  conditions  = jsonencode({
  "allOf": [
    {
      "allOf": [
        {
          "resource.category": {
            "not-equals": "premium"
          }
        }
      ]
    }
  ]
})
  depends_on  = [
    permitio_resource.Article
  ]
}

# User Sets
resource "permitio_user_set" "free_subscribers" {
  key = "free_subscribers"
  name = "Free Subscribers"
  conditions = jsonencode({
  allOf = [
    {
      allOf = [
        {
          "user.subscription_tier" = {
            equals = "free"
          }
        }
      ]
    }
  ]
})
  depends_on = [
    permitio_user_attribute.user_subscription_tier
  ]
}
resource "permitio_user_set" "premium_subscribers" {
  key = "premium_subscribers"
  name = "Premium Subscribers"
  conditions = jsonencode({
  allOf = [
    {
      allOf = [
        {
          "user.subscription_tier" = {
            equals = "premium"
          }
        }
      ]
    }
  ]
})
  depends_on = [
    permitio_user_attribute.user_subscription_tier
  ]
}
