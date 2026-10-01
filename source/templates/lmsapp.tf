terraform {
  required_providers {
    permitio = {
      source = "permitio/permit-io"
      version = "~> 0.0.14"
    }
  }
}

provider "permitio" {
  api_url = {{API_URL}}
  api_key = {{API_KEY}}
}

# Resources
resource "permitio_resource" "course" {
  name        = "course"
  description = ""
  key         = "course"

  actions = {
    "enroll" = {
      name = "enroll"
    },
    "read" = {
      name = "read"
    },
    "create" = {
      name = "create"
    },
    "delete" = {
      name = "delete"
    }
  }
  attributes = {
    "department" = {
      name = "Department"
      type = "string"
    },
    "studentIds" = {
      name = "Student Ids"
      type = "array"
    },
    "teacherId" = {
      name = "Teacher Id"
      type = "string"
    }
  }
}

# User Attributes
resource "permitio_user_attribute" "user_department" {
  key         = "department"
  type        = "string"
  description = ""
}
resource "permitio_user_attribute" "user_id" {
  key         = "id"
  type        = "string"
  description = ""
}
resource "permitio_user_attribute" "user_role" {
  key         = "role"
  type        = "string"
  description = "user role"
}

# Roles

# Condition Set Rules
resource "permitio_condition_set_rule" "student_Courses_Where_Student_is_Enrolled_and_Same_Department_course_read" {
  user_set     = permitio_user_set.student.key
  permission   = "course:read"
  resource_set = permitio_resource_set.Courses_Where_Student_is_Enrolled_and_Same_Department.key
  depends_on   = [
    permitio_resource_set.Courses_Where_Student_is_Enrolled_and_Same_Department,
    permitio_user_set.student
  ]
}
resource "permitio_condition_set_rule" "teacher_Courses_Matching_Teacher_Department_course_read" {
  user_set     = permitio_user_set.teacher.key
  permission   = "course:read"
  resource_set = permitio_resource_set.Courses_Matching_Teacher_Department.key
  depends_on   = [
    permitio_resource_set.Courses_Matching_Teacher_Department,
    permitio_user_set.teacher
  ]
}
resource "permitio_condition_set_rule" "student_Courses_Matching_Teacher_Department_course_read" {
  user_set     = permitio_user_set.student.key
  permission   = "course:read"
  resource_set = permitio_resource_set.Courses_Matching_Teacher_Department.key
  depends_on   = [
    permitio_resource_set.Courses_Matching_Teacher_Department,
    permitio_user_set.student
  ]
}
resource "permitio_condition_set_rule" "teacher_Courses_Matching_Teacher_Department_course_create" {
  user_set     = permitio_user_set.teacher.key
  permission   = "course:create"
  resource_set = permitio_resource_set.Courses_Matching_Teacher_Department.key
  depends_on   = [
    permitio_resource_set.Courses_Matching_Teacher_Department,
    permitio_user_set.teacher
  ]
}
resource "permitio_condition_set_rule" "student_Courses_Where_Student_Can_Enroll_course_enroll" {
  user_set     = permitio_user_set.student.key
  permission   = "course:enroll"
  resource_set = permitio_resource_set.Courses_Where_Student_Can_Enroll.key
  depends_on   = [
    permitio_resource_set.Courses_Where_Student_Can_Enroll,
    permitio_user_set.student
  ]
}

# Resource Sets
resource "permitio_resource_set" "Courses_Where_Student_Can_Enroll" {
  name        = "Courses Where Student Can Enroll"
  key         = "Courses_Where_Student_Can_Enroll"
  resource    = permitio_resource.course.key
  conditions  = jsonencode({
  "allOf": [
    {
      "allOf": [
        {
          "resource.department": {
            "equals": {
              "ref": "user.department"
            }
          }
        }
      ]
    }
  ]
})
  depends_on  = [
    permitio_resource.course
  ]
}
resource "permitio_resource_set" "Courses_Where_Student_is_Enrolled_and_Same_Department" {
  name        = "Courses Where Student is Enrolled and Same Department"
  key         = "Courses_Where_Student_is_Enrolled_and_Same_Department"
  resource    = permitio_resource.course.key
  conditions  = jsonencode({
  "allOf": [
    {
      "allOf": [
        {
          "resource.department": {
            "equals": {
              "ref": "user.department"
            }
          }
        },
        {
          "resource.studentIds": {
            "array_contains": {
              "ref": "user.id"
            }
          }
        }
      ]
    }
  ]
})
  depends_on  = [
    permitio_resource.course
  ]
}
resource "permitio_resource_set" "Courses_Matching_Teacher_Department" {
  name        = "Courses Matching Teacher Department"
  key         = "Courses_Matching_Teacher_Department"
  resource    = permitio_resource.course.key
  conditions  = jsonencode({
  "allOf": [
    {
      "allOf": [
        {
          "resource.department": {
            "equals": {
              "ref": "user.department"
            }
          }
        }
      ]
    }
  ]
})
  depends_on  = [
    permitio_resource.course
  ]
}

# User Sets
resource "permitio_user_set" "admin" {
  key = "admin"
  name = "admin"
  conditions = jsonencode({
  allOf = [
    {
      allOf = [
        {
          "user.role" = {
            equals = "admin"
          }
        }
      ]
    }
  ]
})
  depends_on = [
    permitio_user_attribute.user_role
  ]
}
resource "permitio_user_set" "student" {
  key = "student"
  name = "student"
  conditions = jsonencode({
  allOf = [
    {
      allOf = [
        {
          "user.role" = {
            equals = "student"
          }
        }
      ]
    }
  ]
})
  depends_on = [
    permitio_user_attribute.user_role
  ]
}
resource "permitio_user_set" "teacher" {
  key = "teacher"
  name = "teacher"
  conditions = jsonencode({
  allOf = [
    {
      allOf = [
        {
          "user.role" = {
            equals = "teacher"
          }
        }
      ]
    }
  ]
})
  depends_on = [
    permitio_user_attribute.user_role
  ]
}