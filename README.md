# Permit CLI [![test](https://github.com/permitio/permit-cli/actions/workflows/node.js.yml/badge.svg)](https://github.com/vadimdemedes/pastel/actions/workflows/node.js.yml) [![Join our Slack!](https://img.shields.io/badge/Slack%20Community-4A154B?logo=slack&logoColor=white)](https://io.permit.io/cli-slack) ![Early Stage Development](https://img.shields.io/badge/⚠️_Early_Stage_Development-2B1400)

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

## Commands
All the commands in the CLI are available via the `permit` command in the following convention:
```bash
$ permit [command] [options]
```

For example:
```bash
$ permit pdp check --user user@permit.io --action list --resource transactions
```

- [`login`](#login) - login to your Permit.io account
- `logout` - logout from Permit.io
- `pdp` - a collection of commands to work with Permit's Policy Decision Point (PDP)
	- `run` - print a docker command to run your Permit PDP
	- `check` - perform an authorization check against the PDP
- `env` - a collection of commands to manage Permit policy environments
	- `copy` - copy a Permit environment with its policies to another environment
  - `member` - add and assign roles to members in Permit
  - `select` - select a different active Permit.io environment
- `opa` - a collection of commands for better OPA experience
	-  `policy` - print the available policies of an active OPA instance
-  `gitops create github` - configure Permit environment to use [GitOps flow](https://docs.permit.io/integrations/gitops/overview/)

### `login`
Use this command to login (or signup) to your Permit.io account. The command will take you to the browser to perform user authentication and then let you choose the workspace, project, and environment to fetch and store an API key for future command runs.

#### Options
- `key` - store a Permit API key in your workstation keychain instead of running browser authentication
- `workspace` - predefined workspace key to skip the workspace selection step

#### Example

## Development
Permit CLI is based on 

### Setup Development Environment
- Checkout this repo
- Run `npm install`
- Run `npm run dev`
- Use the CLI with the following convention `node ./dist/cli.js command [options]`

### Write Tests
Permit CLI enforce UT coverage level of >90% for the code in main.

The CLI uses [`vitest`](https://vitest.dev/) as its test framework. It also uses [`ink-testing-library`](https://github.com/vadimdemedes/ink-testing-library) to render the `Ink` components.

- run `npm run tests` for testing and coverage

## CLI

```
$ permit-cli --help

  Usage
    $ permit-cli

  Examples
    $ permit-cli pdp check -u filip@permit.io -a create -r task
    Checking user="filip@permit.io" action=create resource=task at tenant=default
    ALLOWED

    $ permit-cli api-key permit_key_..........
    Key saved to './permit.key'
```
