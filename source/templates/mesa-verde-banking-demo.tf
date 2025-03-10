terraform {
  required_providers {
    permitio = {
      source  = "permitio/permit-io"
      version = "~> 0.0.14"
    }
  }
}

provider "permitio" {
  api_url = "https://api.permit.io"
  api_key = {{API_KEY}}
}

resource "permitio_resource" "Wire_Transfer" {
  name        = "Wire"
  key         = "Wire_Transfer"
  description = "Wire Transfer resource for modeling approval workflows"
  actions = {
    "approve" = {
      name = "Approve"
    }
    "review" = {
      name = "Review"
    }
    "deny" = {
      name = "Deny"
    }
    "operate" = {
      name = "Operate"
    }
    "create" = {
      name = "Operate"
    }
  }
  attributes = {
    "id" = {
      name = "ID"
      type = "string"
    }
    "description" = {
      name = "Description"
      type = "string"
    }
    "date" = {
      name = "Date"
      type = "string"
    }
    "currency" = {
      name = "Currency"
      type = "string"
    }
    "amount" = {
      name = "Amount"
      type = "number"
    }
  }
}

resource "permitio_resource" "Account" {
  key  = "Account"
  name = "Account"
  actions = {
    "read" = {
      name = "Read"
    }
    "add-beneficiaries" = {
      name = "Add Beneficiaries"
    }
    "add-members" = {
      name = "Add Members"
    }
  }
  attributes = {
  }
}

resource "permitio_resource" "Transaction" {
  key  = "Transaction"
  name = "Transaction"
  actions = {
    "create" = {
      name = "Create"
    }
    "list" = {
      name = "List"
    }
  }
  attributes = {
    "id" = {
      name = "ID"
      type = "string"
    }
    "description" = {
      name = "Description"
      type = "string"
    }
    "date" = {
      name = "Date"
      type = "string"
    }
    "currency" = {
      name = "Currency"
      type = "string"
    }
    "amount" = {
      name = "Amount"
      type = "number"
    }
  }
}

resource "permitio_resource_set" "Small_Transaction" {
  key      = "Small_Transaction"
  name     = "Small Transaction"
  resource = permitio_resource.Transaction.key
  conditions = jsonencode({
    "allOf" : [
      { "resource.amount" : { "less-than-equals" : 1000 } }
    ],
  })
  depends_on = [permitio_resource.Transaction]
}

resource "permitio_resource_set" "Large_Transaction" {
  key      = "Large_Transaction"
  name     = "Large Transaction"
  resource = permitio_resource.Transaction.key
  conditions = jsonencode({
    "allOf" : [
      { "resource.amount" : { "greater-than-equals" : 1000 } }
    ],
  })
  depends_on = [permitio_resource.Transaction]
}

resource "permitio_resource_set" "Small_Wire" {
  key      = "Small_Wire"
  name     = "Small Wire"
  resource = permitio_resource.Wire_Transfer.key
  conditions = jsonencode({
    "allOf" : [
      { "resource.amount" : { "less-than-equals" : 1000 } }
    ],
  })
  depends_on = [permitio_resource.Wire_Transfer]
}

resource "permitio_resource_set" "Large_Wire" {
  key      = "Large_Wire"
  name     = "Large Wire"
  resource = permitio_resource.Wire_Transfer.key
  conditions = jsonencode({
    "allOf" : [
      { "resource.amount" : { "greater-than-equals" : 1000 } }
    ],
  })
  depends_on = [permitio_resource.Wire_Transfer]
}

resource "permitio_user_attribute" "location" {
  key  = "location"
  type = "string"
  description = "Location of the user"
}

resource "permitio_user_attribute" "strongAuth" {
  key = "strongAuth"
  type = "bool"
  description = "Strong Auth enabled"
}

resource "permitio_user_attribute" "country" {
  key = "country"
  type = "string"
  description = "User permanent country"
}

resource "permitio_user_set" "Safe_Owners" {
  key  = "Safe_Owners"
  name = "Safe Owners"
  conditions = jsonencode({
    "allOf" : [
      {
        "user.location" : {
          "equals" : {
            "ref" : "user.country"
          }
        }
      },
      {
        "user.roles" : {
          "array_contains" : "AccountOwner"
        }
      }
    ]
  })
  depends_on = [permitio_user_attribute.location, permitio_user_attribute.country, permitio_role.AccountOwner]
}

resource "permitio_user_set" "Unsafe_Owners" {
  key  = "Unsafe_Owners"
  name = "Unsafe Owners"
  conditions = jsonencode({
    "allOf" : [
      {
        "user.location" : {
          "not-equals" : {
            "ref" : "user.country"
          }
        }
      },
      {
        "user.roles" : {
          "array_contains" : "AccountOwner"
        }
      }
    ]
  })
  depends_on = [permitio_user_attribute.location, permitio_user_attribute.country, permitio_role.AccountOwner]
}

resource "permitio_user_set" "Strong_Auth_Owners" {
  key  = "Strong_Auth_Owners"
  name = "Strong Auth Owners"
  conditions = jsonencode({
    "allOf" : [
      {
        "user.roles" : {
          "array_contains" : "AccountOwner"
        }
      },
      {
        "user.strongAuth" : {
          "equals" : true
        }
      }
    ]
  })
  depends_on = [permitio_user_attribute.strongAuth, permitio_role.AccountOwner]
}

resource "permitio_role" "AccountOwner" {
  key  = "AccountOwner"
  name = "Account Owner"
  permissions = [
    "Account:add-members",
    "Account:add-beneficiaries",
    "Account:read",
    "Transaction:list",
    "Wire_Transfer:create",
    "Wire_Transfer:approve",
  ]
  depends_on = [permitio_resource.Wire_Transfer, permitio_resource.Transaction, permitio_resource.Account]
}

resource "permitio_role" "AccountBeneficiary" {
  key  = "AccountBeneficiary"
  name = "Account Beneficiary"
  permissions = [
    "Account:add-members",
    "Account:read",
    "Transaction:list",
  ]
  depends_on = [permitio_resource.Account, permitio_resource.Transaction]
}

resource "permitio_role" "AccountMember" {
  key  = "AccountMember"
  name = "Account Member"
  permissions = [
    "Account:read",
  ]
  depends_on = [permitio_resource.Account]
}

resource "permitio_role" "_Approved_" {
  key         = "_Approved_"
  name        = "_Approved_"
  resource    = permitio_resource.Wire_Transfer.key
  permissions = ["operate"]
  depends_on  = [permitio_resource.Wire_Transfer]
}

resource "permitio_role" "_Reviewer_" {
  key         = "_Reviewer_"
  name        = "_Reviewer_"
  resource    = permitio_resource.Wire_Transfer.key
  permissions = ["approve", "deny", "review"]
  depends_on  = [permitio_resource.Wire_Transfer]
}

resource "permitio_role" "Sender" {
  key         = "Sender"
  name        = "Sender"
  resource    = permitio_resource.Transaction.key
  permissions = ["list"]
  depends_on  = [permitio_resource.Transaction]
}

resource "permitio_role" "Receiver" {
  key         = "Receiver"
  name        = "Receiver"
  resource    = permitio_resource.Transaction.key
  permissions = ["list"]
  depends_on  = [permitio_resource.Transaction]
}

resource "permitio_condition_set_rule" "allow_safeowners_large_transactions" {
  user_set     = permitio_user_set.Safe_Owners.key
  resource_set = permitio_resource_set.Large_Transaction.key
  permission   = "Transaction:create"
  depends_on   = [permitio_resource_set.Large_Transaction, permitio_user_set.Safe_Owners]
}

resource "permitio_condition_set_rule" "allow_strongauth_large_transactions" {
  user_set     = permitio_user_set.Strong_Auth_Owners.key
  resource_set = permitio_resource_set.Large_Transaction.key
  permission   = "Transaction:create"
  depends_on   = [permitio_resource_set.Large_Transaction, permitio_user_set.Strong_Auth_Owners]
}

resource "permitio_condition_set_rule" "allow_unsafeowners_small_transactions" {
  user_set     = permitio_user_set.Unsafe_Owners.key
  resource_set = permitio_resource_set.Small_Transaction.key
  permission   = "Transaction:create"
  depends_on   = [permitio_resource_set.Small_Transaction, permitio_user_set.Unsafe_Owners]
}

resource "permitio_condition_set_rule" "allow_safeowners_small_transactions" {
  user_set     = permitio_user_set.Safe_Owners.key
  resource_set = permitio_resource_set.Small_Transaction.key
  permission   = "Transaction:create"
  depends_on   = [permitio_resource_set.Small_Transaction, permitio_user_set.Safe_Owners]
}

resource "permitio_condition_set_rule" "allow_strongauth_small_transactions" {
  user_set     = permitio_user_set.Strong_Auth_Owners.key
  resource_set = permitio_resource_set.Small_Transaction.key
  permission   = "Transaction:create"
  depends_on   = [permitio_resource_set.Small_Transaction, permitio_user_set.Strong_Auth_Owners]
}

resource "permitio_condition_set_rule" "beneficiary_small_transactions" {
  user_set     = permitio_role.AccountBeneficiary.key
  resource_set = permitio_resource_set.Small_Transaction.key
  permission   = "Transaction:create"
  depends_on   = [permitio_resource_set.Small_Transaction, permitio_role.AccountBeneficiary]
}

resource "permitio_condition_set_rule" "beneficiary_small_wire" {
  user_set     = permitio_role.AccountBeneficiary.key
  resource_set = permitio_resource_set.Small_Wire.key
  permission   = "Wire_Transfer:create"
  depends_on   = [permitio_resource_set.Small_Wire, permitio_role.AccountBeneficiary]
}

