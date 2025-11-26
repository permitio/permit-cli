terraform {
	required_providers {
	  permitio = {
		source  = "permitio/permit-io"
		version = "~> 0.0.14"
	  }
	}
  }

  provider "permitio" {
	api_key = var.permit_api_key  # Set via PERMITIO_API_KEY env var
	api_url = "https://api.permit.io"
  }

  # Variable for API key
  variable "permit_api_key" {
	description = "Permit.io API Key"
	type        = string
	sensitive   = true
  }

  # User Attributes
  resource "permitio_user_attribute" "spending_limit" {
	key         = "spending_limit"
	description = "Maximum amount user can spend"
	type        = "number"
  }

  resource "permitio_user_attribute" "department" {
	key         = "department"
	description = "User's department"
	type        = "string"
  }

  resource "permitio_user_attribute" "job_level" {
	key         = "job_level"
	description = "User's job level (Junior, Senior, Manager)"
	type        = "string"
  }

  resource "permitio_user_attribute" "approval_limit" {
	key         = "approval_limit"
	description = "Maximum amount user can approve"
	type        = "number"
  }

  # Expense Resource with Attributes
  resource "permitio_resource" "expense" {
	key         = "expense"
	name        = "Expense"
	description = "Employee expense reports"

	actions = {
	  "submit" = {
		name        = "Submit"
		description = "Submit expense for approval"
	  }
	  "approve" = {
		name        = "Approve"
		description = "Approve expense"
	  }
	  "view" = {
		name        = "View"
		description = "View expense details"
	  }
	}

	attributes = {
	  "expense_amount" = {
		type        = "number"
		description = "Amount of the expense"
	  }
	  "category" = {
		type        = "string"
		description = "Expense category (travel, meals, supplies, etc)"
	  }
	  "submitter_department" = {
		type        = "string"
		description = "Department of expense submitter"
	  }
	  "urgency" = {
		type        = "string"
		description = "Urgency level (normal, urgent)"
	  }
	}
  }

  # User Set: Regular Employees (can submit within their limit)
  resource "permitio_user_set" "regular_employees" {
	key  = "regular_employees"
	name = "Regular Employees"

	conditions = jsonencode({
	  "allOf" = [
		{ "user.job_level" = { "in" = ["Junior", "Senior"] } }
	  ]
	})

	depends_on = [
	  permitio_user_attribute.job_level
	]
  }

  # User Set: Department Managers (can approve expenses in their department)
  resource "permitio_user_set" "department_managers" {
	key  = "department_managers"
	name = "Department Managers"

	conditions = jsonencode({
	  "allOf" = [
		{ "user.job_level" = { "equals" = "Manager" } },
		{ "user.approval_limit" = { "greater-than-equals" = { "ref" = "resource.expense_amount" } } },
		{ "user.department" = { "equals" = { "ref" = "resource.submitter_department" } } }
	  ]
	})

	depends_on = [
	  permitio_user_attribute.job_level,
	  permitio_user_attribute.approval_limit,
	  permitio_user_attribute.department
	]
  }

  # User Set: Senior Managers (can approve high-value expenses)
  resource "permitio_user_set" "senior_managers" {
	key  = "senior_managers"
	name = "Senior Managers"

	conditions = jsonencode({
	  "allOf" = [
		{ "user.job_level" = { "equals" = "Senior Manager" } },
		{ "user.approval_limit" = { "greater-than-equals" = { "ref" = "resource.expense_amount" } } }
	  ]
	})

	depends_on = [
	  permitio_user_attribute.job_level,
	  permitio_user_attribute.approval_limit
	]
  }

  # User Set: Finance Team (can approve any expense)
  resource "permitio_user_set" "finance_team" {
	key  = "finance_team"
	name = "Finance Team"

	conditions = jsonencode({
	  "allOf" = [
		{ "user.department" = { "equals" = "Finance" } }
	  ]
	})

	depends_on = [
	  permitio_user_attribute.department
	]
  }

  # Resource Set: Submittable Expenses (within user's spending limit)
  resource "permitio_resource_set" "submittable_expenses" {
	key      = "submittable_expenses"
	name     = "Submittable Expenses"
	resource = permitio_resource.expense.key

	conditions = jsonencode({
	  "allOf" = [
		{ "resource.expense_amount" = { "less-than-equals" = { "ref" = "user.spending_limit" } } }
	  ]
	})

	depends_on = [
	  permitio_user_attribute.spending_limit,
	  permitio_resource.expense
	]
  }

  # Resource Set: Department Expenses (standard approval workflow)
  resource "permitio_resource_set" "department_expenses" {
	key      = "department_expenses"
	name     = "Department Expenses"
	resource = permitio_resource.expense.key

	conditions = jsonencode({
	  "allOf" = [
		{ "resource.expense_amount" = { "less-than" = 5000 } },
		{ "resource.urgency" = { "equals" = "normal" } }
	  ]
	})

	depends_on = [
	  permitio_resource.expense
	]
  }

  # Resource Set: High-Value Expenses (need senior approval)
  resource "permitio_resource_set" "high_value_expenses" {
	key      = "high_value_expenses"
	name     = "High Value Expenses"
	resource = permitio_resource.expense.key

	conditions = jsonencode({
	  "allOf" = [
		{ "resource.expense_amount" = { "greater-than-equals" = 5000 } }
	  ]
	})

	depends_on = [
	  permitio_resource.expense
	]
  }

  # Resource Set: All Expenses (for finance team)
  resource "permitio_resource_set" "all_expenses" {
	key      = "all_expenses"
	name     = "All Expenses"
	resource = permitio_resource.expense.key

	conditions = jsonencode({
	  "allOf" = [
		{ "resource.expense_amount" = { "greater-than" = 0 } }
	  ]
	})

	depends_on = [
	  permitio_resource.expense
	]
  }

  # Condition Set Rules

  # Rule: Regular employees can submit expenses within their limit
  resource "permitio_condition_set_rule" "employee_submit_rule" {
	user_set     = permitio_user_set.regular_employees.key
	resource_set = permitio_resource_set.submittable_expenses.key
	permission   = "expense:submit"

	depends_on = [
	  permitio_user_set.regular_employees,
	  permitio_resource_set.submittable_expenses
	]
  }

  # Rule: Regular employees can view expenses they submitted
  resource "permitio_condition_set_rule" "employee_view_rule" {
	user_set     = permitio_user_set.regular_employees.key
	resource_set = permitio_resource_set.submittable_expenses.key
	permission   = "expense:view"

	depends_on = [
	  permitio_user_set.regular_employees,
	  permitio_resource_set.submittable_expenses
	]
  }

  # Rule: Department managers can view department expenses
  resource "permitio_condition_set_rule" "manager_view_rule" {
	user_set     = permitio_user_set.department_managers.key
	resource_set = permitio_resource_set.department_expenses.key
	permission   = "expense:view"

	depends_on = [
	  permitio_user_set.department_managers,
	  permitio_resource_set.department_expenses
	]
  }

  # Rule: Department managers can approve department expenses
  resource "permitio_condition_set_rule" "manager_approve_rule" {
	user_set     = permitio_user_set.department_managers.key
	resource_set = permitio_resource_set.department_expenses.key
	permission   = "expense:approve"

	depends_on = [
	  permitio_user_set.department_managers,
	  permitio_resource_set.department_expenses
	]
  }

  # Rule: Senior managers can view high-value expenses
  resource "permitio_condition_set_rule" "senior_view_rule" {
	user_set     = permitio_user_set.senior_managers.key
	resource_set = permitio_resource_set.high_value_expenses.key
	permission   = "expense:view"

	depends_on = [
	  permitio_user_set.senior_managers,
	  permitio_resource_set.high_value_expenses
	]
  }

  # Rule: Senior managers can approve high-value expenses
  resource "permitio_condition_set_rule" "senior_approve_rule" {
	user_set     = permitio_user_set.senior_managers.key
	resource_set = permitio_resource_set.high_value_expenses.key
	permission   = "expense:approve"

	depends_on = [
	  permitio_user_set.senior_managers,
	  permitio_resource_set.high_value_expenses
	]
  }

  # Rule: Finance team can view all expenses
  resource "permitio_condition_set_rule" "finance_view_rule" {
	user_set     = permitio_user_set.finance_team.key
	resource_set = permitio_resource_set.all_expenses.key
	permission   = "expense:view"

	depends_on = [
	  permitio_user_set.finance_team,
	  permitio_resource_set.all_expenses
	]
  }

  # Rule: Finance team can approve any expense
  resource "permitio_condition_set_rule" "finance_approve_rule" {
	user_set     = permitio_user_set.finance_team.key
	resource_set = permitio_resource_set.all_expenses.key
	permission   = "expense:approve"

	depends_on = [
	  permitio_user_set.finance_team,
	  permitio_resource_set.all_expenses
	]
  }

  # Output the resource configurations for reference
  output "expense_workflow_setup" {
	value = {
	  resource_id = permitio_resource.expense.key
	  user_sets = [
		permitio_user_set.regular_employees.key,
		permitio_user_set.department_managers.key,
		permitio_user_set.senior_managers.key,
		permitio_user_set.finance_team.key
	  ]
	  resource_sets = [
		permitio_resource_set.submittable_expenses.key,
		permitio_resource_set.department_expenses.key,
		permitio_resource_set.high_value_expenses.key,
		permitio_resource_set.all_expenses.key
	  ]
	  rules_count = 8
	}
	description = "Expense workflow ABAC configuration summary"
  }
