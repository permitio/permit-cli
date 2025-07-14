terraform {
  required_providers {
    permitio = {
      source  = "permitio/permit-io"
      version = "~> 0.0.12"
    }
  }
}

provider "permitio" {
  api_url = "https://api.permit.io"
  api_key = "{{API_KEY}}"
}

# Resources
resource "permitio_resource" "Course" {
  name        = "Course"
  description = "A course in the Learning Management System"
  key         = "Course"

  actions = {
    "create" = {
      name = "create"
    },
    "read" = {
      name = "read"
    },
    "update" = {
      name = "update"
    },
    "delete" = {
      name = "delete"
    },
    "enroll" = {
      name = "enroll"
    }
  }
  attributes = {
    "enrolledStudents" = {
      name = "Enrolled Students"
      type = "array"
    },
    "teacherId" = {
      name = "Teacher ID"
      type = "string"
    }
  }
}

resource "permitio_resource" "Enrollment" {
  name        = "Enrollment"
  description = "Student enrollment in a course"
  key         = "Enrollment"

  actions = {
    "create" = {
      name = "create"
    },
    "read" = {
      name = "read"
    },
    "delete" = {
      name = "delete"
    }
  }
  attributes = {}
}

resource "permitio_resource" "Assignment" {
  name        = "Assignment"
  description = "An assignment linked to a course"
  key         = "Assignment"

  actions = {
    "create" = {
      name = "create"
    },
    "read" = {
      name = "read"
    },
    "update" = {
      name = "update"
    },
    "delete" = {
      name = "delete"
    },
    "grade" = {
      name = "grade"
    }
  }
  attributes = {
    "dueDate" = {
      name = "Due Date"
      type = "string"
    }
  }
}

# Roles
resource "permitio_role" "Student" {
  key         = "student"
  name        = "Student"
  permissions = ["Course:read", "Enrollment:create", "Assignment:read", "Assignment:submit"]

  depends_on = [permitio_resource.Course, permitio_resource.Enrollment, permitio_resource.Assignment]
}

resource "permitio_role" "Teacher" {
  key         = "teacher"
  name        = "Teacher"
  permissions = ["Course:create", "Course:read", "Course:update", "Course:delete", "Assignment:read", "Assignment:grade"]

  depends_on = [permitio_resource.Course, permitio_resource.Assignment]
}

resource "permitio_role" "Teaching_Assistant" {
  key         = "teaching_assistant"
  name        = "Teaching Assistant"
  permissions = ["Course:read", "Course:update", "Assignment:read"]

  depends_on = [permitio_resource.Course, permitio_resource.Assignment]
}

resource "permitio_role" "Admin" {
  key         = "admin"
  name        = "Admin"
  permissions = [
    "Course:create", "Course:read", "Course:update", "Course:delete",
    "Enrollment:create", "Enrollment:read", "Enrollment:delete",
    "Assignment:create", "Assignment:read", "Assignment:update", "Assignment:delete", "Assignment:grade"
  ]

  depends_on = [permitio_resource.Course, permitio_resource.Enrollment, permitio_resource.Assignment]
}

# Relations
resource "permitio_relation" "Course_Teacher" {
  key              = "assigned_to"
  name             = "Assigned To"
  subject_resource = permitio_resource.Course.key
  object_resource  = permitio_resource.Teacher.key
  depends_on = [
    permitio_resource.Course,
    permitio_resource.Teacher
  ]
}

# Resource Sets
resource "permitio_resource_set" "Enrolled_Course" {
  name        = "Enrolled Course"
  key         = "Enrolled_Course"
  resource    = permitio_resource.Course.key
  conditions  = jsonencode({
    "allOf": [
      {
        "allOf": [
          {
            "resource.enrolledStudents": {
              "contains": "{{user_id}}"
            }
          }
        ]
      }
    ]
  })
  depends_on = [permitio_resource.Course]
}

# Role Derivations
resource "permitio_role_derivation" "Teacher_to_Course" {
  role        = permitio_role.Teacher.key
  on_resource = permitio_resource.Course.key
  to_role     = permitio_role.Teacher.key
  resource    = permitio_resource.Course.key
  linked_by   = permitio_relation.Course_Teacher.key
  depends_on = [
    permitio_role.Teacher,
    permitio_resource.Course,
    permitio_relation.Course_Teacher
  ]
}

# Condition Set Rules
resource "permitio_condition_set_rule" "student_read_enrolled_course" {
  user_set     = "student"
  resource_set = "Enrolled_Course"
  permission   = "Course:read"
  depends_on   = [permitio_role.Student, permitio_resource_set.Enrolled_Course]
}