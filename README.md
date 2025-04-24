# Permit CLI

<p align="center">
<a href="https://www.permit.io/?utm_source=github&utm_medium=referral&utm_campaign=cli" align="center">
    <picture align="center">
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/user-attachments/assets/6445b00c-26c3-492a-b8ab-504e45b64d50" height="90">
      <img src="https://github.com/user-attachments/assets/02087b99-1a72-4ffd-a1c3-d97b3c9e5ddb" height="90">
    </picture>
</a>
</p>

[![test](https://github.com/permitio/permit-cli/actions/workflows/node.js.yml/badge.svg)](https://github.com/vadimdemedes/pastel/actions/workflows/node.js.yml) [![Join our Slack!](https://img.shields.io/badge/Slack%20Community-4A154B?logo=slack&logoColor=white)](https://io.permit.io/cli-slack) ![Early Stage Development](https://img.shields.io/badge/⚠️_Early_Stage_Development-2B1400) ![Follow us on LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)

The **Permit CLI** is an open-source command-line tool that empowers developers to manage, test, and automate fine-grained access control across applications.

Designed with developer experience in mind, the CLI makes it easy to integrate **Fine-Grained Authorization (FGA)** and manage, test, and deploy access control logic across various systems, including [OPA](https://github.com/open-policy-agent/opa), [OPAL](https://github.com/permitio/opal), [CEDAR](https://github.com/permitio/cedar-agent), AVP, OpenFGA, and the Permit.io service.

## What You Can Do with Permit CLI

- ⚙️ Create and manage authorization policies in projects and environments
- 🧪 Test and validate access control with audit log replays and end-to-end simulations
- 🚀 Run and interact with Policy Decision Points (PDPs) locally or remotely
- 🏗️ Automate policy operations in CI/CD with IaC and GitOps
- ✨ Generate policies from natural language using AI
- 🔐 Manage users, roles, and permissions directly from your terminal

> :bulb: The CLI is fully open source and is built with Pastel, using TypeScript and a React-style architecture. Contributions welcome!

## Installation

The Permit CLI is now available only via `npm` and requires a [Node.js installation](https://nodejs.org/en/download) to run.

```
npm install -g @permitio/cli
```

## Usage

All the commands in the CLI are available via the `permit` command in the following convention:

```bash
$ permit [command] [options]
```

For example:

```
$ permit pdp check --user user@permit.io --action list --resource transactions
```

---

# Full Command-List

Below is a categorized overview of all available Permit CLI commands:

### [Authentication](#basic-commands-authentication)

- [`permit login`](#permit-login) – Log in to your [Permit.io](https://www.permit.io/) account and authenticate your session.
- [`permit logout`](#permit-logout) – Log out and clear stored credentials.

### [PDP (Policy Decision Point) Operations](#basic-commands-policy-decision-point-pdp-operations)

- [`permit pdp run`](#permit-pdp-run) – Start a Permit PDP container using Docker.
- [`permit pdp check`](#permit-pdp-check) – Perform real-time authorization checks against the PDP.
- [`permit pdp stats`](#permit-pdp-stats) – View performance metrics and audit statistics from your PDP instance.

### [SDLC](#sdlc)

- [Automate environment creation and management](#automate-environment-creation-and-management)

  - [`permit env create`](#permit-env-create) – Create a new environment.
  - [`permit env copy`](#permit-env-copy) – Copy policies between environments.
  - [`permit env delete`](#permit-env-delete) – Delete an environment.
  - [`permit env member`](#permit-env-member) – Add members to an environment and assign roles.
  - [`permit env select`](#permit-env-select) – Switch active environment context.

- [Terraform and IaC](#terraform-and-iac)
  - [`permit env export terraform`](#permit-env-export-terraform)

### [Fine-Grained Authorization Configuration](#fine-grained-authorization-configuration-1)

- [AI-Powered Policy Generation](#ai-powered-policy-generation)

  - [`permit policy create ai`](#permit-policy-create-ai) - Use natural language to generate and apply structured RBAC policies using AI.

- [Interactive Policy Wizard](#interactive-policy-wizard)

  - [`permit init`](#permit-init) - Initialize the policy creation wizard.
  - [`permit policy create simple`](#permit-policy-create-simple) - Use a table-style wizard or command-line arguments to define a policy with resources, actions, and roles.

- [Permissions Templates](#template-based-policy-setup)

  - [`permit env template list`](#permit-env-template-list) – List available policy templates to apply.
  - [`permit env template apply`](#permit-env-template-apply) – Apply a policy template to your current environment.

- [API Commands](#api-commands)
  - [`permit api sync user`](#permit-api-sync-user) - Create or update a user with attributes and role assignments.
  - [`permit api users list`](#permit-api-users-list) - List all users in your Permit.io account.
  - [`permit api users assign`](#permit-api-users-assign) - Assign a role to a user within a specified tenant.
  - [`permit api users unassign`](#permit-api-users-unassign) - Remove a role assignment from a user.

### [Policy Testing](#policy-testing-1)

- [`permit test run audit`](#permit-test-run-audit) – Audit your policy decisions against recent logs.

- [E2E Tests](#execute-e2e-tests)
  - [`permit test generate e2e`](#permit-test-generate-e2e) – Generate end-to-end policy test configurations and (optionally) test data.

### [API-First Authorization](#api-first-authorization-1)

- [OpenAPI -x Extensions for Policy Configuration - TBD](#openapi--x-permit-extensions-for-policy-configuration---tbd)
- [URL-based Permissions - TBD](#url-based-permissions---tbd)

### [Custom Rego (OPA) and GitOps](#custom-rego-opa-and-gitops-1)

- [Sync policies to Git Repositories](#sync-policies-to-git-repositories)

  - [`permit gitops create github`](#permit-gitops-create-github) - Set up GitOps integration for a Permit environment using a GitHub repository.
  - [`permit gitops env clone`](#permit-gitops-env-clone) - Clone an environment or an entire project from a GitOps repository.

- [Extend Predefined Policies with Custom Rego (Open Policy Agent)](#extend-predefined-policies-with-custom-rego-open-policy-agent)
  - [`permit opa policy`](#permit-opa-policy) - Print policies from a running OPA (Open Policy Agent) instance.

---

# In-Depth Command Overview

## Basic Commands: Authentication

#### `permit login`

You must log in to your [Permit.io](http://permit.io/) account to run commands.

The `login` command will take you to the browser to perform user authentication and then let you choose the workspace, project, and environment for future command runs.

**Arguments (Optional):**

- `--api-key <string>` - store a Permit API key in your workstation keychain instead of running browser authentication
- `--workspace <string>` - predefined workspace key to skip the workspace selection step

**Example:**

```bash
$ permit login
```

---

#### `permit logout`

This command will log you out of your Permit account and remove the stored key from your workspace.

**Example:**

```bash
$ permit logout
```

## Basic Commands: Policy Decision Point (PDP) Operations

This collection of commands aims to improve the experience of working with the PDPs (Permit PDP or Open Policy Agent).

#### `permit pdp run`

Use this command to run a Permit PDP Docker container configured with your [Permit.io](http://permit.io/) account details. The command will start the container in detached mode and display the container ID and name.

**Arguments (Optional):**

- `--api-key <string>` - use a specific API key instead of the stored one
- `--opa <number>` - expose the OPA instance running in the PDP
- `--dry-run` - print the Docker command without executing it

**Examples:**

Run the PDP container

```bash
$ permit pdp run
```

Run the PDP container with OPA exposed on port 8181

```
$ permit pdp run --opa 8181
```

Print the Docker command without running the container:

```
$ permit pdp run --dry-run
```

Run the PDP with a specific API key:

```
$ permit pdp run --api-key your_api_key
```

---

#### `permit pdp check`

Use this command to perform an authorization check against the PDP. The command will take the user, action, and resource (and some other enrichment arguments) as options and return the decision.

**Arguments (Required):**

- `--user <string>` - the user ID to check the authorization for
- `--action <string>` - the action to check the authorization for
- `--resource <string>` - the resource to check the authorization for

**Arguments (Optional):**

- `--tenant <string>` - the tenant to check the authorization for (`default: default`)
- `--pdpurl <string>` - the PDP URL to check the authorization against (`default: http://localhost:7676`)
- `--user-attributes` - additional user attributes to enrich the authorization check in the format: `key1=value1,key2=value2`
- `-resource-attributes` - additional resource attributes to enrich the authorization check in the format `key1=value1,key2=value2`

**Example:**

```bash
$ permit  pdp check --user eventHandler --action update --resource Widget:dashboard-1-widget
```

---

#### `permit pdp stats`

Use this command to view statistics about your PDP's performance and usage. This is useful for monitoring and debugging your PDP instance.

**Arguments (Optional):**

- `--project-key <string>` - The project key
- `--environment-key <string>` - the environment key
- `--stats-url <string>` - the URL of the PDP service. Default to the cloud PDP
- `--api-key <string>` - the API key for the Permit env, project, or Workspace
- `--top` - run stats in top mode (`default: false`)

**Example:**

```bash
$ permit pdp stats
```

# SDLC

### Automate environment creation and management

Use CLI commands to create, copy, and manage environments

#### `permit env create`

This command creates a new environment in a specified project. This is useful for setting up new environments for development, testing, or production.

**Arguments (Optional):**

- `--api-key <string>` - a Permit API key to authenticate the operation. If not provided, the command will use your stored credentials.
- `--name <string>` - the name of the new environment (will prompt if not provided)
- `--env-key <string>` - the key for the new environment (will be derived from name if not provided)
- `--description <string>` - the description of the new environment
- `--customBranchName` - customizes the GitOps branch name of this environment (default is set to the environment ID)
- `--jwks <string>` - JSON Web Key Set (JWKS) for frontend login, in JSON format
- `--settings <string>` - environment settings in JSON format

**Examples:**

```bash
$ permit env create --api-key permit_key --name "Staging" --description "Staging environment for testing"
```

**You can also create a complex environment with all options:**

```bash
$ permit env create --api-key permit_key --name "Development" --envKey "dev" --description "Dev environment" --customBranchName "dev-branch" --jwks '{"ttl": 3600}' --settings '{"debug": true}'
```

---

#### `permit env copy`

Developers and CI pipelines can use this command to enable secure blue-green deployment in the Software Development Lifecycle (SDLC). The command will get the source and destination environments as options and copy the policies from one to another.

This will let you run your tests again in a non-production environment and safely merge them into production after the tests.

**Arguments (Required):**

- `--api-key <string>` - a Permit API key at the project level or higher to authenticate the operation

**Arguments (Optional - Will prompt if not provided):**

- `--from <string>` - the source environment to copy the policies from
- `--to <string>` - the destination environment to copy the policies to
- `--name <string>` - the name of a new environment to copy the policies to
- `--description <string>` - the description of a new environment to copy the policies to
- `--conflict-strategy <fail | overwrite>` - the strategy to handle conflicts when copying policies (`default: fail`)

**Example:**

```bash
$ permit env copy --api-key permit_key --from staging --to production --conflict-strategy overwrite
```

---

#### `permit env delete`

This command deletes an existing environment.

> :blub: Note: **Use with caution: this operation cannot be undone.**

**Arguments (Optional):**

- `--api-key <string>` - a Permit API key to authenticate the operation. If not provided, the command will use your stored credentials.
- `--environment-id <string>` - the ID of the environment to delete (will prompt if not provided)
- `--force <boolean>` - skip confirmation prompts (`default: false`)

**Examples:**

```bash
$ permit env delete --api-key permit_key --environmentId env_456
```

**To force deletion without confirmation:**

```bash
$ permit env delete --api-key permit_key --environmentId env_456 --force
```

> Note: If you've authenticated via Permit’s login, the commands will use your current project context automatically.

---

#### `permit env member`

This command will assign members to an environment with the roles you specify. This is useful for managing the access control of your team members in the [Permit.io](http://permit.io/) environment.

This command can run in the CI after creating a new environment for development or testing to assign the roles to the team members who need to access the environment.

**Arguments (Required):**

- `--api-key <string>` (Required) - a Permit API key in project level or higher to authenticate the operation

**Arguments (Optional - Will prompt if not provided):**

- `--environment <string>` - the environment to assign the roles to
- `--project <string>` - the project to assign the roles to
- `--email <string>` - the email of the member to assign the roles to
- `--role <Owner | Editor | Member>` - the role to assign to the member

**Example:**

```bash
$ permit env member --api-key permit_key --environment staging --project my-project --email gabriel@permit.io --role Owner
```

---

#### `permit env select`

This command lets you select a different active [Permit.io](http://permit.io/) environment. This is useful when you have multiple environments in your account and want to switch between them without logging out and logging in again.

**Arguments (Required):**

- `--api-key <string>` - a Permit API key at the project level or higher to authenticate the operation. If not provided, the command will reauthenticate you in the browser.

**Example:**

```bash
$ permit env select --api-key permit_key
```

### Terraform and IaC

Define and enforce policies programmatically within DevOps pipelines

#### `permit env export terraform`

This command exports your Permit environment configuration as a Terraform HCL file.

This is useful for users who want to start working with Terraform after configuring their Permit settings through the UI or API. The command exports all environment content (resources, roles, user sets, resource sets, condition sets) in the Permit Terraform provider format.

**Arguments (Optional)**

- `--api-key <string>` - a Permit API key to authenticate the operation. If not provided, the command will use the AuthProvider to get the API key you logged in with.
- `--file <string>` - a file path where the exported HCL should be saved. If not provided, the output will be printed to the console.

**Examples:**

Using the Permit key -

```bash
$ permit env export terraform --api-key permit_key --file permit-config.tf
```

With the logged-in session -

```bash
$ permit env export terraform --file permit-config.tf
```

Print out the output to the console -

```bash
$ permit env export terraform
```

## Fine-Grained Authorization Configuration

Use natural language commands with AI to instantly set up and enforce fine-grained authorization policies.

### AI-Powered Policy Generation

Generate customized, ready-to-use policy structures using natural language

#### `permit policy create ai`

This command allows you to create RBAC policies using natural language. It uses AI to convert your descriptions into structured Role-Based Access Control policies that can be applied to your [Permit.io](http://permit.io/) environment.

**Arguments (Optional):**

- `--api-key <string>` - Your [Permit.io](http://permit.io/) API key. If not provided, the command will use your stored credentials.

### `env template apply`

Use this command to apply a policy template to your current environment. This is useful for quickly setting up new environments with predefined configurations.
The command is using the Terraform provider to apply the template, but it's not required to have Terraform installed.

#### Options

- `--api-key <string>` (Optional) - API Key to be used for the environment to apply the policy template
- `--local` (Optional) - to run the Terraform command locally instead of the server (will fail if Terraform is not installed)
- `--template <string>` (Optional) - skips the template choice and applies the given template. It will fail if the template does not exist

#### Example

```bash
$ permit env template apply --template my-template
```

### `env apply openapi`

This command creates a full policy schema in Permit by reading an OpenAPI spec file and using `-x-permit` extensions to define resources, actions, roles, relations, and more. This enables developers to use their OpenAPI schema as a configuration source for their authorization policy.

#### Options

- `--api-key <string>` (Optional) - API key for Permit authentication
- `--spec-file <string>` (Optional) - Path to the OpenAPI file to read from. It could be a local path or an HTTP endpoint.

#### Example

```bash
# Run with spec file locally:
$ permit env apply openapi --spec-file ./api-spec.json

# Run With API key:
$ permit env apply openapi --key permit_key_... --spec-file https://raw.githubusercontent.com/daveads/openapispec/main/blog-api.json
```

#### OpenAPI Extensions

The command uses the following `-x-permit` extensions in your OpenAPI spec to map elements to the Permit policy:

##### Path or Endpoint Level Extensions

- `x-permit-resource` - The resource name to map the path to. This field is **REQUIRED** for a path to be mapped.

##### Operation Level Extensions (HTTP Method Level)

- `x-permit-action` - Name of an action to map the HTTP method to. If not provided, the HTTP method name (get, post, etc.) will be used as the action.
- `x-permit-role` - Name of a top-level role that is ALLOWED for this particular operation.
- `x-permit-resource-role` - Name of a resource-level role that is ALLOWED for this particular operation.
- `x-permit-relation` - A JSON object defining a relation between resources.
- `x-permit-derived-role` - A JSON object defining role derivation rules.

#### Example OpenAPI Spec with Permit Extensions

```yaml
openapi: 3.0.3
info:
  title: 'Blog API with Permit Extensions'
  version: '1.0.0'
paths:
  /posts:
    x-permit-resource: blog_post
    get:
      summary: List all posts
      x-permit-action: list
      x-permit-role: viewer
      # ...
    post:
      summary: Create a new post
      x-permit-action: create
      x-permit-role: editor
      x-permit-resource-role: post_creator
      # ...
  /posts/{postId}:
    x-permit-resource: blog_post
    get:
      summary: Get a post by ID
      x-permit-action: read
      x-permit-role: viewer
      # ...
    put:
      summary: Update a post
      x-permit-action: update
      x-permit-role: editor
      # ...
    delete:
      summary: Delete a post
      x-permit-action: delete
      x-permit-role: admin
      # ...
  /posts/{postId}/comments:
    x-permit-resource: blog_comment
    get:
      summary: Get comments for a post
      x-permit-action: list
      x-permit-role: viewer
      x-permit-relation:
        subject_resource: blog_comment
        object_resource: blog_post
        key: belongs_to_post
        name: Belongs To Post
      # ...
    post:
      summary: Add a comment to a post
      x-permit-action: create
      x-permit-role: commenter
      x-permit-derived-role:
        key: post_commenter
        name: Post Commenter
        base_role: viewer
        derived_role: commenter
      # ...
```

Check this repo for a good [example](https://github.com/daveads/openapispec)

#### Complex Extension Objects

For the more complex extensions that accept objects instead of strings, here's the expected structure:

##### `x-permit-relation` Object Structure

```json
{
	"subject_resource": "string", // Required: The source resource in the relation
	"object_resource": "string", // Required: The target resource in the relation
	"key": "string", // Optional: Unique identifier for the relation (generated if not provided)
	"name": "string" // Optional: Human-readable name (generated if not provided)
}
```

##### `x-permit-derived-role` Object Structure

```json
{
	"key": "string", // Optional: Unique identifier for the derived role
	"name": "string", // Optional: Human-readable name for the derived role
	"base_role": "string", // Required: The role that grants the derived role
	"derived_role": "string", // Required: The role to be derived
	"resource": "string" // Optional: The resource that the derived role applies to (defaults to the path's resource)
}
```

#### URL Mapping

After creating the policy elements based on the `-x-permit` extensions, the command will automatically create URL mappings in Permit. These mappings connect API endpoints to the appropriate resources and actions for runtime authorization checks.

For each endpoint with the required extensions, a mapping rule will be created with:

- URL path from the OpenAPI spec
- HTTP method
- Resource from `x-permit-resource`
- Action from `x-permit-action` or the HTTP method

This enables Permit to perform authorization checks directly against your API endpoints.

---

### `opa`

This collection of commands aims to create new experiences for developers working with Open Policy Agent (OPA) in their projects.

### `opa policy`

This command will print the available policies of an active OPA instance. This is useful when you want to see the policies in your OPA instance without fetching them from the OPA server.

#### Options

- `--server-url <string>` (Optional) - the URL of the OPA server to fetch the policies from (default: `http://localhost:8181`)
- `--api-key <string>` (Optional) - the API key to authenticate the operation

#### Example

```bash
$ permit opa policy --server-url http://localhost:8181 --api-key permit_key_..........
```

---

### `api sync user`

This command will Replace User / Sync User in the system. If the user already exits, it will update the user with the new data. If the user does not exist, it will create a new user with the provided data.

#### options:

- `api_key <string>`(optional) : a Permit API key to authenticate the operation. If not provided, the command will take the one you logged in with.

- `key <string>` : A unique id by which Permit will identify the user for permission checks. If not given in the argument the interactive CLI is open to retrive the `key`. It has the alias as `user-id`.

- `email <string>`: The email of the user. If synced, will be unique inside the environment.

- `first_name <string>` : First name of the user.
- `last_name <string>` : Last name of the user.
- `attributes <object>` : Arbitrary user attributes that will be used to enforce attribute-based access control policies.
- `roles` : roles of the user. Given in 3 different formats.
  1. Only role the default tenant is assigned.
  2. Both the role and the tenant
  3. The resource Instance along with the role.

### Example

```bash
$ permit api sync user
  --apiKey "YOUR_API_KEY" \
  --key "892179821739812389327" \
  --email "jane@coolcompany.com" \
  --firstName "Jane" \
  --lastName "Doe" \
  --attributes  "age:30" \
  --attributes "location:NY" \
  --roles "admin:stripe-inc" \
  --roles "developer" \
  --roles "project:123#developer"
```

---

### `gitops create github`

This command will configure your Permit environment to use the GitOps flow with GitHub. This is useful when you want to manage your policies in your own Git repository and extend them with custom policy code.

#### Options

- `--key <string>` (Optional) - a Permit API key to authenticate the operation. If not provided, the command will take the one you logged in with.
- `--inactive <boolean>` (Optional) - set the environment to inactive after configuring GitOps (default: `false`)

---

### `gitops env clone`

This clones the environment or the complete project from the active gitops repository.

#### options

- `--api-key <string>` (Optional) - The API key to select the project. The API Key is of the scope `Project`.
- `--dry-run` (Optional) - Instead of executing the code it just displays the command to be executed.
- `--project` (Optional) - Instead of selecting an environment branch to clone it does the standard clone operation.

---

### `api`

This collection of commands provides direct access to Permit.io's API functionality.

### `api users`

This collection of commands helps you manage users in your Permit.io account.

### `api users list`

Use this command to list all users in your Permit.io account.

#### Options

- `--api-key <string>` (Optional) - your Permit.io API key
- `--project-id <string>` (Optional) - Permit.io Project ID
- `--env-id <string>` (Optional) - Permit.io Environment ID
- `--expand-key` (Optional) - show full key values instead of truncated (default: false)
- `--page <number>` (Optional) - page number for pagination (default: 1)
- `--per-page <number>` (Optional) - number of items per page (default: 50)
- `--role <string>` (Optional) - filter users by role
- `--tenant <string>` (Optional) - filter users by tenant
- `--all` (Optional) - fetch all pages of users (default: false)

#### Example

```bash
$ permit api users list
```

### `api users assign`

Use this command to assign a user to a specific role in your Permit.io account.

#### Options

- `--api-key <string>` (Optional) - your Permit.io API key
- `--project-id <string>` (Optional) - Permit.io Project ID
- `--env-id <string>` (Optional) - Permit.io Environment ID
- `--user <string>` (Required) - user ID to assign role to
- `--role <string>` (Required) - role key to assign
- `--tenant <string>` (Required) - tenant key for the role assignment

#### Example

```bash
$ permit api users assign --user user@example.com --role admin --tenant default
```

### `api users unassign`

Use this command to remove a role assignment from a user in your Permit.io account.

#### Options

- `--api-key <string>` (Optional) - your Permit.io API key
- `--project-id <string>` (Optional) - Permit.io Project ID
- `--env-id <string>` (Optional) - Permit.io Environment ID
- `--user <string>` (Required) - user ID to unassign role from
- `--role <string>` (Required) - role key to unassign
- `--tenant <string>` (Required) - tenant key for the role unassignment

#### Example

```bash
$ permit api users unassign --user user@example.com --role admin --tenant default
```

---

### `policy create simple`

A simple policy table creation wizard with the resources, actions and roles.
You can provide resources, actions, and roles as arguments or enter them interactively.

#### Options

- `api-key <string> ` Optional: The Permit API key of the environment.

- `resources <string[]>` (Optional) : Array of resources in the format: "key:name@attribute1,attribute2"
  - `key`: Resource Key
  - `name`: Resource display Name
  - `@attribute1,attribute2` : comma-seperated list of attributes.
- `actions <string[]>` (Optional) : Array of actions in the format: "key:description@attribute1,attribute2"
  - `key` : Action Key
  - `description` : Action description
  - `@attribute1,attribute2`: Comma-sperated list of attributes.
- `roles <string[]>` (Optional) : Array of roles in the format: "role|resource:action|resource:action" or "role|resource"

  - `role`: Role key
  - `resource:action`: The resource and the action to declare the permissions.

```bash
$ permit policy create simple \
  --api-key permit_key_abc123
  --resources users:Users@department,role --resources posts:Posts@category \
  --actions create:Create --actions read:Read \
  --roles admin|users:create|posts:read --roles editor|posts
```

---

### `test`

This collection of commands helps you test and validate your authorization policies.

### `test run audit`

This command reads your recent authorization decision logs from Permit API and runs the same checks against a PDP instance to verify consistency between environments.

The command is particularly useful for validating that policy changes don't break existing authorization behavior and for testing a new PDP instance against production decisions.

#### Options

- `--pdp-url <string>` (Optional) - URL of the PDP to verify against (default: `http://localhost:7766`)
- `--time-frame <number>` (Optional) - Number of hours to fetch audit logs for (between 6 to 72, default: 24)
- `--source-pdp <string>` (Optional) - ID of the PDP to filter audit logs from
- `--users <string[]>` (Optional) - Filter logs by specific users (can provide multiple)
- `--resources <string[]>` (Optional) - Filter logs by specific resources (can provide multiple)
- `--tenant <string>` (Optional) - Filter logs by specific tenant
- `--action <string>` (Optional) - Filter logs by specific action
- `--decision <allow | deny>` (Optional) - Filter logs by decision outcome
- `--max-logs <number>` (Optional) - Maximum number of logs to process (useful for limiting large audit operations)

#### Example

```bash
# Basic test against local PDP using last 24 hours of audit logs
$ permit test run audit
$ permit test run audit --pdp-url http://localhost:7766
# Test against custom PDP URL with filters
$ permit test run audit --pdpUrl http://my-pdp.example.com:7766 --timeFrame 48 --action read --decision allow

# Test with multiple users and resources
$ permit test run audit --users john@example.com alice@example.com --resources document:123 folder:456

# Limit the number of logs processed
$ permit test run audit --max-logs 500
```

### `policy create ai`

This command allows you to create RBAC policies using natural language. It uses AI to convert your descriptions into structured Role-Based Access Control policies that can be applied to your Permit.io environment.

#### Options

- `--api-key <string>` (Optional) - Your Permit.io API key. If not provided, the command will use your stored credentials.

#### Example

**Example:**

```bash
$ permit policy create ai
Type your prompt...
A CRM SaaS application with different user types
```

This will start an interactive chat where you can describe your authorization requirements in natural language. The AI will convert your description into a structured RBAC policy with resources, roles, and permissions.

For example, you could describe:

- A CRM SaaS application with different user types
- Baseline WordPress policy with extended self-service capabilities
- A file storage system with varying levels of access
- Internal ticket management system for production teams

The AI will generate appropriate resources, roles, and permissions based on your description. The generated policy will be displayed in a table format showing the resources, actions, roles, and permissions. You can then approve or reject the generated policy.

If you approve the policy, the CLI will apply the policy to your [Permit.io](http://permit.io/) environment, creating all the resources, roles, and permissions defined in the policy.

### Interactive Policy Wizard

Define resources, generate test users, and assign roles through a simple step-by-step flow.

#### `permit init`

This command is a wizard command that should take the users through all the steps, from configuring policy to enforcing it in the application

**Arguments (Optional):**

- `--api-key <string>`: Use an environment API Key to create and store the policy.

Example:

```
$ permit init --api-key permit_key
```

---

#### `permit policy create simple`

A simple policy table creation wizard with the resources, actions, and roles.
You can provide resources, actions, and roles as arguments or enter them interactively.

**Arguments (Optional):**

- `--api-key <string>` - the Permit API key of the environment.
- `--resources <string[]>` - an array of resources in the format: `key:name@attribute1,attribute2`
  - `key` - resource key
  - `name` - resource display name
  - `@attribute1,attribute2` - a comma-separated list of attributes.
- `--actions <string[]>` - an array of actions in the format: `key:description@attribute1,attribute2`
  - `key` : action key
  - `description` : action description
  - `@attribute1,attribute2`: a comma-separated list of attributes.
- `--roles <string[]>` - array of roles in the format: `role|resource:action|resource:action` or `role|resource`.
  - `role`: role key
  - `resource:action`: the resource and the action to declare the permissions.

```bash
$ permit policy create simple \\
  --api-key permit_key
  --resources users:Users@department,role --resources posts:Posts@category \\
  --actions create:Create --actions read:Read \\
  --roles admin|users:create|posts:read --roles editor|posts
```

### Template-Based Policy Setup

Use pre-built policy templates to automate rule creation for different industries.

#### `permit env template list`

Use this command to list all the available policy templates to apply to your environment.

**Arguments (Optional)**

- `--api-key <string>` - API Key to be used for the environment to apply the Terraform template

**Example:**

```bash
$ permit env template list
```

---

#### `permit env template apply`

This command applies a policy template to your current environment, which is useful for quickly setting up new environments with predefined configurations.

> Note: The command uses the Terraform provider to apply the template, but a Terraform installation is not required.

**Arguments (Optional)**

- `--api-key <string>` - API Key to be used for the environment to apply the policy template
- `--local` - to run the Terraform command locally (instead of on the server - will fail if Terraform isn’t installed)
- `--template <string>` - skips the template choice and applies the given template. Will fail if the template doesn’t exist.

**Example:**

```bash
$ permit env template apply --template mesa-verde-banking-dem
```

### API Commands

Simplifies the usage of Permit’s API, allowing you to perform most API actions directly through the CLI.

#### `permit api sync user`

This command will replace User / Sync User in Permit. If the user already exists, it will update the user with the new data. If the user does not exist, it will create a new user with the provided data.

**Arguments (Optional):**

- `--key <string>` - a unique ID by which Permit will identify the user for permission checks. It has the alias `user-id`.
- `--email <string>`- user email. If synced, it will be unique inside the environment.
- `--first_name <string>` - user first name.
- `--last_name <string>` - user last name.
- `--attributes <object>` - user attributes used to enforce attribute-based access control policies.
- `--roles` - user roles. Can be given in 3 different formats:
  1. The only role the default tenant is assigned.
  2. Both the role and the tenant
  3. The resource Instance along with the role.
- `--api-key <string>`: a Permit API key to authenticate the operation. If not provided, the command will take the one you logged in with.

**Example:**

```bash
$ permit api sync user
  --userid "892179821739812389327" \\
  --email "jane@coolcompany.com" \\
  --firstName "Jane" \\
  --lastName "Doe" \\
  --attributes  "age:30" \\
  --attributes "location:NY" \\
  --roles "admin:stripe-inc" \\
  --roles "developer" \\
  --roles "project:123#developer"
```

---

#### `permit api users list`

Use this command to list all users in Permit.

**Arguments (Optional):**

- `--api-key <string>` - your Permit API key
- `--project-id <string>` - your Permit project ID
- `--env-id <string>` - your Permit environment ID
- `--expand-key` - show full key values instead of truncated (`default: false`)
- `--page <number>` - page number for pagination (`default: 1`)
- `--per-page <number>` - number of items per page (`default: 50`)
- `--role <string>` - filter users by role
- `--tenant <string>` - filter users by tenant
- `--all` - fetch all pages of users (`default: false`)

**Example:**

```bash
$ permit api users list
	--tenant default
	--role admin
	--all
```

In the example above, we fetch a list of all users with the admin role in the default tenant.

---

#### `permit api users assign`

Use this command to assign a user to a specific role in Permit.

**Arguments (Required):**

- `--user <string>` - user ID to assign role to
- `--role <string>` - role key to assign
- `--tenant <string>` - tenant key for the role assignment

**Arguments (Optional):**

- `--api-key <string>` - your Permit API key
- `--project-id <string>` - Permit project ID
- `--env-id <string>` - Permit environment ID

**Example:**

```bash
$ permit api users assign --user user@example.com --role admin --tenant default
```

---

#### `permit api users unassign`

Use this command to remove a role assignment from a user in Permit.

**Arguments (Required):**

- `--user <string>` - user ID to unassign the role from
- `--role <string>` - role key to unassign
- `--tenant <string>` - tenant key for the role unassignment

**Arguments (Optional):**

- `--api-key <string>` - your Permit API key
- `--project-id <string>` - Permit project ID
- `--env-id <string>` - Permit environment ID

**Example:**

```bash
$ permit api users unassign --user user@example.com --role admin --tenant default
```

## Policy Testing

This collection of commands helps you test and validate your authorization policies.

#### `permit test run audit`

This command reads your recent authorization decision logs from the Permit API and runs the same checks against a PDP instance to verify consistency between environments.

The command is particularly useful for validating that policy changes don't break existing authorization behavior and for testing a new PDP instance against production decisions.

**Arguments (Optional)**

- `--api-key <string>` - API Key to be used for test generation.
- `--pdp-url <string>` - URL of the PDP to verify against (default: `http://localhost:7766`)
- `--time-frame <number>` - Number of hours to fetch audit logs for (Between 6 and 72, `default: 24`)
- `--source-pdp <string>` - ID of the PDP to filter audit logs from
- `--users <string[]>` - Filter logs by specific users (can provide multiple)
- `--resources <string[]>` - Filter logs by specific resources (can provide multiple)
- `--tenant <string>` - Filter logs by specific tenant
- `--action <string>` - Filter logs by specific action
- `--decision <allow | deny>` - Filter logs by decision outcome
- `--max-logs <number>` - Maximum number of logs to process (useful for limiting large audit operations)

**Examples:**

Basic test against local PDP using the last 24 hours of audit logs:

```
$ permit test run audit --pdp-url <http://localhost:7766>
```

Testing against custom PDP URL with filters:

```
$ permit test run audit --pdpUrl <http://my-pdp.example.com:7766> --timeFrame 48 --action read --decision allow
```

Testing with multiple users and resources:

```
$ permit test run audit --users john@example.com alice@example.com --resources document:123 folder:456
```

Testing with a limit on the number of logs processed:

```
$ permit test run audit --max-logs 500
```

### Execute E2E tests

Simulate real-world user interactions and business flows to see how policies affect overall application behavior.

#### `permit test generate e2e`

Generate end‑to‑end test configurations (and optionally test data) for your policy.

**Arguments (Optional):**

- `--api-key <string>` - API Key to be used for test generation.
- `--dry-run <boolean>` - If set, generates test cases and mock data **without** making any changes in Permit.
- `--models <string_array>` - List of model names to generate tests for. `default: RBAC`.
- `--path <string>` - Filesystem path where the generated JSON config should be saved (recommended).

> Note: All flags are optional. If you omit `--models`, only the default RBAC model will be processed. If you omit `--dry-run`, real data and users will be created in Permit.

**Examples:**

Generate tests for the default RBAC model, and save the config to disk. Creates end‑to‑end tests for the `RBAC` model and writes the generated JSON config to `logb.json`

```bash
  $ permit test generate e2e --models=RBAC --path=logb.json
```

Generate tests for RBAC, save the config, but don't apply changes (dry run). This is the same as above, but in dry‑run mode, so no changes are made in Permit.

```bash
  $ permit test generate e2e --models=RBAC --path=logb.json --dry-run
```

Generate tests for the RBAC model without saving the config (dry run). This function generates test cases and mock data for `RBAC`, does not save a config file or apply changes, and prints to the terminal.

```bash
  $ permit test generate e2e --models=RBAC --dry-run
```

Generate and apply tests for the RBAC model with default settings. Runs end‑to‑end test generation for `RBAC` using real data (no dry run) and without writing a config file, and prints to the terminal.

```bash
  $ permit test generate e2e --models=RBAC
```

## API-First Authorization

Define and enforce API authorization policies using OpenAPI specifications for a smooth API integration.

### OpenAPI `-x-permit` Extensions for Policy Configuration - TBD

Define access control rules directly within OpenAPI specifications

### URL-based Permissions - TBD

Map API endpoints to policies using simple configurations and FastAPI decorators

## Custom Rego (OPA) and GitOps

Extend and customize authorization policies with GitOps flows and custom Rego logic.

### Sync policies to Git repositories

Export, version, and manage authorization policies as code: all through CLI commands

#### `permit gitops create github`

This command will configure your Permit environment to use the GitOps flow with GitHub. This is useful when you want to manage your policies in your own Git repository and extend them with custom policy code.

**Arguments (Required)**

- `--inactive <boolean>` - set the environment to inactive after configuring GitOps (`default:false`)

**Example:**

```
gitops create github --inactive true
```

---

#### `permit gitops env clone`

This clones the environment or the complete project from the active GitOps repository.

**Arguments (Optional)**

- `--api-key <string>` - The API key to select the project. The API Key is of the scope `Project`.
- `--dry-run` - Instead of executing the code, it displays the command to be executed.
- `--project` - Instead of selecting an environment branch to clone, it performs the standard clone operation.

### Extend Predefined Policies with Custom Rego (Open Policy Agent)

Use the CLI to modify and fine-tune Open Policy Agent (OPA) Rego policies while maintaining system stability

---

#### `permit opa policy`

This command will print the available policies of an active OPA instance. This is useful when you want to see the policies in your OPA instance without fetching them from the OPA server.

**Arguments (Optional)**

- `--api-key <string>` - the API key to authenticate the operation
- `--server-url <string>` - the URL of the OPA server to fetch the policies from (`default: http://localhost:8181`)

**Example:**

```bash
$ permit opa policy --server-url <http://localhost:8181> --api-key permit_key
```

## Development

Permit CLI is based on Pastel, a library for building CLI applications using React-like syntax. The project is written in TypeScript and uses `tsc` to run the CLI commands in development.

### Setting Up a Development Environment

- Run `npm install`
- Run `npm run dev`
- Use the CLI with the following convention `node ./dist/cli.js command [options]`

### Adding New Commands

To add a new command, you need to create a new file in the `src/commands` directory with the command name. The project is using the Pastel library to create the CLI commands. You can find the documentation [here](https://github.com/vadimdemedes/pastel?tab=readme-ov-file#commands).

For a detailed command contribution guide, please refer to the [CONTRIBUTING.md](https://www.notion.so/CONTRIBUTING.md) file.

### Writing Tests

Permit CLI enforces a UT coverage level of >90% for the main code.

The CLI uses [`vitest`](https://vitest.dev/) as its test framework. It also uses [`ink-testing-library`](https://github.com/vadimdemedes/ink-testing-library) to render the `Ink` components.

- Run `npm run tests` for testing and coverage

## Community

We would love to chat with you about the Permit CLI. [Join our Slack community](https://io.permit.io/cli-slack) to chat about access control, open-source, and authorization.

You can raise questions and request features be added to the roadmap in our [**GitHub discussions**](https://github.com/permitio/permit-cli/discussions) and report issues in [\*\*GitHub issues](https://github.com/permitio/permit-cli/issues).\*\*

Like our project? Give us a ⭐️

## Contributing to Permit CLI

We would love for you to contribute to this project and help make it even better than it is today! 💎

As a contributor, here are the guidelines we would like you to follow:

- [Code of Conduct](https://www.notion.so/CODE_OF_CONDUCT.md)
- [Question or Problem?](https://www.notion.so/CONTRIBUTING.md#question)
- [Issues and Bugs](https://www.notion.so/CONTRIBUTING.md#issue)
- [Feature Requests](https://www.notion.so/CONTRIBUTING.md#feature)
- [New Commands Guidelines](https://www.notion.so/CONTRIBUTING.md#new-command-guidelines)

## There's more!

- Check out [OPAL](https://github.com/permitio/OPAL) - the best way to manage Open Policy Agent (OPA), Cedar, and OpenFGA in scale.
- Check out [Cedar-Agent](https://github.com/permitio/cedar-agent), the easiest way to deploy & run AWS Cedar.
