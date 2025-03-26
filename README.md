# Permit CLI [![test](https://github.com/permitio/permit-cli/actions/workflows/node.js.yml/badge.svg)](https://github.com/vadimdemedes/pastel/actions/workflows/node.js.yml) [![Join our Slack!](https://img.shields.io/badge/Slack%20Community-4A154B?logo=slack&logoColor=white)](https://io.permit.io/cli-slack) ![Early Stage Development](https://img.shields.io/badge/⚠️_Early_Stage_Development-2B1400) ![Follow us on LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)

<p align="center">
<a href="https://www.permit.io/?utm_source=github&utm_medium=referral&utm_campaign=cli" align="center">
    <picture align="center">
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/user-attachments/assets/6445b00c-26c3-492a-b8ab-504e45b64d50" height="90">
      <img src="https://github.com/user-attachments/assets/02087b99-1a72-4ffd-a1c3-d97b3c9e5ddb" height="90">
    </picture>
</a>
</p>

The **Permit CLI** is an open-source command-line utility that empowers developers with everything related to [Fine-Grained Authorization (FGA)](https://www.permit.io/blog/what-is-fine-grained-authorization-fga) and Identity and Access Management (IAM). It is a one-stop solution for handling all your authorization needs, seamlessly integrating with tools like OPA, OPAL, CEDAR, AVP, OpenFGA, and the Permit.io service.

> :bulb: Permit CLI is fully open-source and actively accepts [contributions of many cool features](https://github.com/permitio/permit-cli/issues). Leverage your open-source game by [contributing](https://github.com/permitio/permit-cli/issues) and giving it a :star:

## Installation

Permit CLI is now available only via the `npm` and requires a [Node.js installation](https://nodejs.org/en/download) to run

```console
npm install -g @permitio/cli
```

## Usage

All the commands in the CLI are available via the `permit` command in the following convention:

```bash
$ permit [command] [options]
```

For example:

```bash
$ permit pdp check --user user@permit.io --action list --resource transactions
```

## Commands

- [`login`](#login) - login to your Permit.io account
- `logout` - logout from Permit.io
- `pdp` - a collection of commands to work with Permit's Policy Decision Point (PDP)
  - `run` - print a docker command to run your Permit PDP
  - `check` - perform an authorization check against the PDP
- `env` - a collection of commands to manage Permit policy environments
  - `copy` - copy a Permit environment with its policies to another environment
  - `create` - create a new environment in a project
  - `delete` - delete an existing environment
  - `member` - add and assign roles to members in Permit
  - `select` - select a different active Permit.io environment
  - `export` - export environment configurations to different formats
  
- `opa` - a collection of commands for better OPA experience
  - `policy` - print the available policies of an active OPA instance
- `gitops create github` - configure Permit environment to use [GitOps flow](https://docs.permit.io/integrations/gitops/overview/)

---

### `login`

After installing the CLI, you must authenticate to run commands against your Permit.io account.

The `login` command will take you to the browser to perform user authentication and then let you choose the workspace, project, and environment to for future command runs.

#### Options

- `key <string>` (Optional) - store a Permit API key in your workstation keychain instead of running browser authentication
- `workspace <string>` (Optional) - predefined workspace key to skip the workspace selection step

#### Example

```bash
$ permit login
```

---

### `logout`

This command will log you out from your Permit account and remove the stored key from your workspace.

#### Example

```bash
permit logout
```

---

### `pdp`

This collection of commands aims to improve the experience of working with Policy Decision Points (PDP) such as the Permit PDP or Open Policy Agent.

### `pdp run`

Use this command to get a `docker run` command configured with your PDP details from the account you logged in with

#### Options

- `opa <number>` (Optional) - expose the OPA instance running in the PDP

#### Example

```bash
$ permit pdp run --opa 8181
```

### `pdp check`

Use this command to perform an authorization check against the PDP. The command will take the user, action, and resource (and some other enrichment arguments) as options and return the decision.

#### Options

- `user <string>` - the user id to check the authorization for
- `action <string>` - the action to check the authorization for
- `resource <string>` - the resource to check the authorization for
- `tenant <string>` (Optional) - the tenant to check the authorization for (default: `default`)
- `pdpurl <string>` (Optional) - the PDP URL to check the authorization against (default: `http://localhost:7676`)
- `userAttributes` (Optional) - additional user attributes to enrich the authorization check in the format `key1=value1,key2=value2`
- `resourceAttributes` (Optional) - additional resource attributes to enrich the authorization check in the format `key1=value1,key2=value2`

#### Example

```bash
$ permit  pdp check --user eventHandler --action update --resource Widget:dashboard-1-widget
```

---

### `env`

This collection of commands will enable you to automate SDLC operations for Fine-Grained Authorization with Permit.io

### `env copy`

Developers and CI pipelines can use this command to enable secure blue-green deployment in the Software Development Lifecycle (SDLC). The command will get the source and destination environments as options and copy the policies from one to another. This will let you run your tests again in a non-production environment and merge it safely into production after the tests.

#### Options

- `key <string>` (Required) - a Permit API key in project level or higher to authenticate the operation
- `from <string>` (Optional) - the source environment to copy the policies from (will prompt if not provided)
- `to <string>` (Optional) - the destination environment to copy the policies to (will prompt if not provided)
- `name <string>` (Optional) - the name of a new environment to copy the policies to (will prompt if not provided)
- `description <string>` (Optional) - the description of a new environment to copy the policies to (will prompt if not provided)
- `conflictStrategy <fail | overwrite>` (Optional) - the strategy to handle conflicts when copying policies (default: `fail`)

#### Example

```bash
$ permit env copy --key permit_key_.......... --from staging --to production --conflictStrategy overwrite
```

### `env create`
This command creates a new environment in a specified project. This is useful for setting up new environments for development, testing, or production.

#### Options

- `apikey` <string> (Optional) - a Permit API key to authenticate the operation. If not provided, the command will use your stored credentials.
- `name` <string> (Optional) - the name of the new environment (will prompt if not provided)
- `envKey` <string> (Optional) - the key for the new environment (will be derived from name if not provided)
- `description` <string> (Optional) - the description of the new environment
- `jwks <string>` (Optional) - JSON Web Key Set (JWKS) for frontend login, in JSON format
- `settings <string>` (Optional) - environment settings in JSON format

#### Example 

```bash
$ permit env create --key permit_key_.......... --name "Staging" --description "Staging environment for testing"
```

**You can also create a complex environment with all options:**
```bash
$ permit env create --apiKey permit_key_.......... --name "Development" --envKey "dev" --description "Dev environment" --customBranchName "dev-branch" --jwks '{"ttl": 3600}' --settings '{"debug": true}'
```

### `env delete`

This command deletes an existing environment. Use with caution as this operation cannot be undone.

#### Options

- key <string> (Optional) - a Permit API key to authenticate the operation. If not provided, the command will use your stored credentials.
- environmentId <string> (Optional) - the ID of the environment to delete (will prompt if not (provided)
- force <boolean> (Optional) - skip confirmation prompts (default: false)

#### Example 
```bash
$ permit env delete --key permit_key_.......... --environmentId env_456
```

**Or to force deletion without confirmation:**

```bash
$ permit env delete --key permit_key_.......... --environmentId env_456 --force
```

> **Note:** If you've authenticated via `permit login`, the commands will use your current project context automatically.

### `env member`

This command will assign members to environment with the roles you specify. This is useful for managing the access control of your team members in the Permit.io environment.

This command can run in the CI after creating a new environment for development or testing to assign the roles to the team members who need to access the environment.

#### Options

- `key <string>` (Required) - a Permit API key in project level or higher to authenticate the operation
- `environment <string>` (Optional) - the environment to assign the roles to (will prompt if not provided)
- `project <string>` (Optional) - the project to assign the roles to (will prompt if not provided)
- `email <string>` (Optional) - the email of the member to assign the roles to (will prompt if not provided)
- `role <Owner | Editor | Member>` (Optional) - the role to assign to the member (will prompt if not provided)

#### Example

```bash
$ permit env member --key permit_key_.......... --environment staging --project my-project --email gabriel@permit.io --role Owner
```

### `env select`

This command will let you select a different active Permit.io environment. This is useful when you have multiple environments in your account and you want to switch between them without logging out and logging in again.

#### Options

- `key <string>` (Optional) - a Permit API key in project level or higher to authenticate the operation. If not provided, the command will reauthenticate you in the browser.

#### Example

```bash
$ permit env select --key permit_key_.........
```

### `env export terraform`

This command exports your Permit environment configuration as a Terraform HCL file. This is useful for users who want to start working with Terraform after configuring their Permit settings through the UI or API. The command export all environment content (resources, roles, user sets, resource sets, condition sets) in the Permit Terraform provider format.

Options

- key <string> (Optional) - a Permit API key to authenticate the operation. If not provided, the command will use the AuthProvider to get the API key you logged in with.

- file <string> (Optional) - a file path where the exported HCL should be saved. If not provided, the output will be printed to the console.

### Example

### Using the permit key

```bash
$ permit env export terraform --key permit_key_.......... --file permit-config.tf
```

### With login session

```bash
$ permit env export terraform --file permit-config.tf
```

### output configuration to console

```bash
permit env export terraform
```

---

### `opa`

This collection of commands aims to create new experiences for developers working with Open Policy Agent (OPA) in their projects.

### `opa policy`

This command will print the available policies of an active OPA instance. This is useful when you want to see the policies in your OPA instance without fetching them from the OPA server.

#### Options

- `serverUrl <string>` (Optional) - the URL of the OPA server to fetch the policies from (default: `http://localhost:8181`)
- `apiKey <string>` (Optional) - the API key to authenticate the operation

#### Example

```bash
$ permit opa policy --serverUrl http://localhost:8181 --apiKey permit_key_..........
```

---

### `gitops create github`

This command will configure your Permit environment to use the GitOps flow with GitHub. This is useful when you want to manage your policies in your own Git repository and extend them with custom policy code.

#### Options

- `key <string>` (Optional) - a Permit API key to authenticate the operation. If not provided, the command will take the one you logged in with.
- `inactive <boolean>` (Optional) - set the environment to inactive after configuring GitOps (default: `false`)

## Development

Permit CLI is based on Pastel, a library for building CLI applications using React-like syntax. The project is written in TypeScript and uses `tsc` to run the CLI commands in development.

### Setup Development Environment

- Checkout this repo
- Run `npm install`
- Run `npm run dev`
- Use the CLI with the following convention `node ./dist/cli.js command [options]`

### Add New Commands

To add a new command, you need to create a new file in the `src/commands` directory with the command name. The project is using the Pastel library to create the CLI commands. You can find the documentation [here](https://github.com/vadimdemedes/pastel?tab=readme-ov-file#commands)

For a detailed command contribution guide, please refer to the [CONTRIBUTING.md](CONTRIBUTING.md) file.

### Write Tests

Permit CLI enforce UT coverage level of >90% for the code in main.

The CLI uses [`vitest`](https://vitest.dev/) as its test framework. It also uses [`ink-testing-library`](https://github.com/vadimdemedes/ink-testing-library) to render the `Ink` components.

- run `npm run tests` for testing and coverage

## Community

We would love to chat with you about Pernut CKU. [Join our Slack community](https://io.permit.io/cli-slack) to chat about fine-grained authorization, open-source, realtime communication, tech, or anything else!

You can raise questions and ask for features to be added to the road-map in our [**Github discussions**](https://github.com/permitio/permit-cli/discussions), report issues in [**Github issues**](https://github.com/permitio/permit-cli/issues)

If you like our project, please consider giving us a ⭐️

## Contributing to Permit CLI

We would love for you to contribute to this project and help make it even better than it is today! 💎

As a contributor, here are the guidelines we would like you to follow:

- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Question or Problem?](CONTRIBUTING.md#question)
- [Issues and Bugs](CONTRIBUTING.md#issue)
- [Feature Requests](CONTRIBUTING.md#feature)
- [New Commands Guidelines](CONTRIBUTING.md#new-command-guidelines)

## There's more!

- Check out [OPAL](https://github.com/permitio/OPAL) - the best way to manage Open Policy Agent (OPA), Cedar, and OpenFGA in scale.
- Check out [Cedar-Agent](https://github.com/permitio/cedar-agent), the easiest way to deploy & run AWS Cedar.
