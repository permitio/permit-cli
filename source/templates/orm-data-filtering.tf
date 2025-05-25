terraform {
  required_providers {
    permitio = {
      source = "permitio/permit-io"
      version = "~> 0.0.14"
    }
  }
}

provider "permitio" {
  api_url = "https://api.permit.io"
  api_key = {{API_KEY}}
}

# Resources
resource "permitio_resource" "project" {
  name        = "Project"
  description = ""
  key         = "project"

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
resource "permitio_resource" "task" {
  name        = "Task"
  description = ""
  key         = "task"

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

# Roles
resource "permitio_role" "project__Member" {
  key         = "Member"
  name        = "Member"
  resource    = permitio_resource.project.key
  permissions = ["read"]

  depends_on  = [permitio_resource.project]
}
resource "permitio_role" "task__Member" {
  key         = "Member"
  name        = "Member"
  resource    = permitio_resource.task.key
  permissions = ["read"]

  depends_on  = [permitio_resource.task]
}

# Relations
resource "permitio_relation" "project_task" {
  key              = "parent"
  name             = "parent"
  subject_resource = permitio_resource.project.key
  object_resource  = permitio_resource.task.key
  depends_on = [
    permitio_resource.task,
    permitio_resource.project,
  ]
}

# Role Derivations
resource "permitio_role_derivation" "project_Member_to_task_Member" {
  role        = permitio_role.project__Member.key
  on_resource = permitio_resource.project.key
  to_role     = permitio_role.task__Member.key
  resource    = permitio_resource.task.key
  linked_by   = permitio_relation.project_task.key
  depends_on = [
    permitio_role.project__Member,
    permitio_resource.project,
    permitio_role.task__Member,
    permitio_resource.task,
    permitio_relation.project_task
  ]
}