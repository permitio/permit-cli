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

resource "permitio_resource" "visit" {
  name        = "Visit"
  description = "Visit"
  key         = "visit"
  actions = {
    "read" = {
      name = "Read"
    }
  }
  attributes = {
    "diagnosis" = {
      name = "Diagnosis"
      type = "array"
    }
    practitioner_id = {
      name = "Practitioner"
      type = "string"
    }
    concealed = {
      name = "Concealed"
      type = "bool"
    }
    appointment_id = {
      name = "Appointment"
      type = "string"
    }
  }
}

resource "permitio_resource" "diagnosis" {
  name        = "Diagnosis"
  description = "Diagnosis"
  key         = "diagnosis"
  actions = {
    "read" = {
      name = "Read"
    }
  }
  attributes = {
    "concealment" = {
      name = "Concealment"
      type = "bool"
    }
  }
}

resource "permitio_resource" "practitioner" {
  name        = "Practitioner"
  description = "Practitioner"
  key         = "practitioner"
  actions = {
    "read" = {
      name = "Read"
    }
  }
  attributes = {
    "is_advertised" = {
      name = "Advertised"
      type = "bool"
    }
  }
}

resource "permitio_resource_set" "non_consealed_diagnosis" {
  name     = "Non Concealed Diagnosis"
  key      = "non_consealed_diagnosis"
  resource = permitio_resource.diagnosis.key
  conditions = jsonencode({
    "allOf" : [
      {
        "allOf" : [
          { "resource.concealment" : { "equals" : false } },
        ],
      },
    ],
  })
  depends_on = [permitio_resource.diagnosis]
}

resource "permitio_resource_set" "non_consealed_visit" {
  name     = "Non Concealed Visit"
  key      = "non_consealed_visit"
  resource = permitio_resource.visit.key
  conditions = jsonencode({
    "allOf" : [
      {
        "allOf" : [
          { "resource.concealed" : { "equals" : false } },
          { "resource.appointment_id" : { "not-equals" : "" } }
        ],
      },
    ],
  })
  depends_on = [permitio_resource.visit]
}

resource "permitio_resource_set" "advertised_practitioner" {
  name     = "Advertised Practitioner"
  key      = "advertised_practitioner"
  resource = permitio_resource.practitioner.key
  conditions = jsonencode({
    "allOf" : [
      {
        "allOf" : [
          { "resource.is_advertised" : { "equals" : true } },
        ],
      },
    ],
  })
  depends_on = [permitio_resource.practitioner]
}

resource "permitio_resource_set" "allowed_visit" {
  name     = "Allowed Visit"
  key      = "allowed_visit"
  resource = permitio_resource.visit.key
  conditions = jsonencode({
    "allOf" : [
      { "resource.concealed" : { "equals" : false } },
      { "resource.practitioner_id" : {
        "object_match" : {
          "match" : {
            "is_advertised" : { "equals" : true }
          },
          "fk_resource_type" : permitio_resource.practitioner.key,
        }
      } },
      {
        "resource.diagnosis" : {
          "all_match" : {
            "match" : {
              "concealment" : { "equals" : false }
            },
            "fk_resource_type" : permitio_resource.diagnosis.key,
          }
        }
      },
    ],
  })
}

resource "permitio_role" "user" {
  key         = "user"
  name        = "User"
  description = "Application user"
  permissions = []
  depends_on = [
    permitio_resource_set.non_consealed_diagnosis,
    permitio_resource_set.non_consealed_visit,
    permitio_resource_set.advertised_practitioner,
  ]
}

resource "permitio_condition_set_rule" "allow_concealed_diagnosis" {
  user_set     = permitio_role.user.key
  resource_set = permitio_resource_set.non_consealed_diagnosis.key
  permission   = "diagnosis:read"
  depends_on   = [permitio_resource_set.non_consealed_diagnosis, permitio_role.user]
}

resource "permitio_condition_set_rule" "allow_concealed_visit" {
  user_set     = permitio_role.user.key
  resource_set = permitio_resource_set.non_consealed_visit.key
  permission   = "visit:read"
  depends_on   = [permitio_resource_set.non_consealed_visit, permitio_role.user]
}

resource "permitio_condition_set_rule" "allow_advertised_practitioner" {
  user_set     = permitio_role.user.key
  resource_set = permitio_resource_set.advertised_practitioner.key
  permission   = "practitioner:read"
  depends_on   = [permitio_resource_set.advertised_practitioner, permitio_role.user]
}

# Starting ReBAC configuration
resource "permitio_resource" "bool_mark" {
  name        = "Bool Mark"
  description = "Bool Mark"
  key         = "bool_mark"
  actions = {
    "read" = {
      name = "Read"
    }
  }
  attributes = {
    "mark" = {
      name = "Mark"
      type = "bool"
    }
  }
}

resource "permitio_role" "allowed_user" {
  key         = "allowed_user"
  name        = "Allowed User"
  resource    = permitio_resource.bool_mark.key
  permissions = []
  depends_on  = [permitio_resource.bool_mark]
}

resource "permitio_role" "visit_user" {
  key         = "visit_user"
  name        = "Allowed Visit User"
  resource    = permitio_resource.visit.key
  permissions = ["read"]
  depends_on  = [permitio_resource.visit]
}

resource "permitio_role" "diagnosis_user" {
  key         = "diagnosis_user"
  name        = "Allowed Diagnosis User"
  resource    = permitio_resource.diagnosis.key
  permissions = []
  depends_on  = [permitio_resource.diagnosis]
}

resource "permitio_role" "practitioner_user" {
  key         = "practitioner_user"
  name        = "Allowed Practitioner User"
  resource    = permitio_resource.practitioner.key
  permissions = []
  depends_on  = [permitio_resource.practitioner]
}

resource "permitio_role" "diagnosis_visit_user" {
  key         = "diagnosis_visit_user"
  name        = "Allowed Diagnosis and Visit User"
  resource    = permitio_resource.visit.key
  permissions = ["read"]
  depends_on  = [permitio_resource.visit]
}

resource "permitio_role" "practitioner_visit_user" {
  key         = "practitioner_visit_user"
  name        = "Allowed Practitioner and Visit User"
  resource    = permitio_resource.visit.key
  permissions = ["read"]
  depends_on  = [permitio_resource.visit]
}

resource "permitio_relation" "bool_mark_visit" {
  key              = "non_concealed_visit"
  name             = "Visit in not concealed"
  subject_resource = permitio_resource.bool_mark.key
  object_resource  = permitio_resource.visit.key
  depends_on = [
    permitio_resource.visit,
    permitio_resource.bool_mark,
  ]
}

resource "permitio_relation" "bool_mark_diagnosis" {
  key              = "non_concealed_diagnosis"
  name             = "Diagnosis in not concealed"
  subject_resource = permitio_resource.bool_mark.key
  object_resource  = permitio_resource.diagnosis.key
  depends_on = [
    permitio_resource.diagnosis,
    permitio_resource.bool_mark,
  ]
}

resource "permitio_relation" "bool_mark_practitioner" {
  key              = "advertised_practitioner"
  name             = "Practitioner is advertised"
  subject_resource = permitio_resource.bool_mark.key
  object_resource  = permitio_resource.practitioner.key
  depends_on = [
    permitio_resource.practitioner,
    permitio_resource.bool_mark,
  ]
}

resource "permitio_relation" "visit_diagnosis" {
  key              = "part"
  name             = "Visit's Diagnosis"
  subject_resource = permitio_resource.diagnosis.key
  object_resource  = permitio_resource.visit.key
  depends_on = [
    permitio_resource.visit,
    permitio_resource.diagnosis,
  ]
}

resource "permitio_relation" "visit_practitioner" {
  key              = "owner"
  name             = "Visit's Practitioner"
  subject_resource = permitio_resource.practitioner.key
  object_resource  = permitio_resource.visit.key
  depends_on = [
    permitio_resource.visit,
    permitio_resource.practitioner,
  ]
}

resource "permitio_role_derivation" "allowed_user_visit_user" {
  role        = permitio_role.allowed_user.key
  on_resource = permitio_resource.bool_mark.key
  to_role     = permitio_role.visit_user.key
  resource    = permitio_resource.visit.key
  linked_by   = permitio_relation.bool_mark_visit.key
  depends_on = [
    permitio_role.allowed_user,
    permitio_resource.bool_mark,
    permitio_role.visit_user,
    permitio_resource.visit,
    permitio_relation.bool_mark_visit,
  ]
}

resource "permitio_role_derivation" "allowed_user_diagnosis_user" {
  role        = permitio_role.allowed_user.key
  on_resource = permitio_resource.bool_mark.key
  to_role     = permitio_role.diagnosis_user.key
  resource    = permitio_resource.diagnosis.key
  linked_by   = permitio_relation.bool_mark_diagnosis.key
  depends_on = [
    permitio_role.allowed_user,
    permitio_resource.bool_mark,
    permitio_role.diagnosis_user,
    permitio_resource.diagnosis,
    permitio_relation.bool_mark_diagnosis,
  ]
}

resource "permitio_role_derivation" "allowed_user_practitioner_user" {
  role        = permitio_role.allowed_user.key
  on_resource = permitio_resource.bool_mark.key
  to_role     = permitio_role.practitioner_user.key
  resource    = permitio_resource.practitioner.key
  linked_by   = permitio_relation.bool_mark_practitioner.key
  depends_on = [
    permitio_role.allowed_user,
    permitio_resource.bool_mark,
    permitio_role.practitioner_user,
    permitio_resource.practitioner,
    permitio_relation.bool_mark_practitioner,
  ]
}

resource "permitio_role_derivation" "allowed_user_diagnosis_visit_user" {
  role        = permitio_role.diagnosis_user.key
  on_resource = permitio_resource.diagnosis.key
  to_role     = permitio_role.diagnosis_visit_user.key
  resource    = permitio_resource.visit.key
  linked_by   = permitio_relation.visit_diagnosis.key
  depends_on = [
    permitio_role.allowed_user,
    permitio_resource.bool_mark,
    permitio_role.diagnosis_visit_user,
    permitio_resource.visit,
    permitio_relation.visit_diagnosis,
  ]
}

resource "permitio_role_derivation" "allowed_user_practitioner_visit_user" {
  role        = permitio_role.practitioner_user.key
  on_resource = permitio_resource.practitioner.key
  to_role     = permitio_role.practitioner_visit_user.key
  resource    = permitio_resource.visit.key
  linked_by   = permitio_relation.visit_practitioner.key
  depends_on = [
    permitio_role.allowed_user,
    permitio_resource.bool_mark,
    permitio_role.practitioner_visit_user,
    permitio_resource.visit,
    permitio_relation.visit_practitioner,
  ]
}