![permit CLI](https://github.com/user-attachments/assets/89dbb075-6d88-4fd7-8d19-9490177248fc)

# Permit CLI

A command line utility from Permit.io to work with everything IAM and Authorization.
A one-stop-shop to manage all your Authorization tools (OPA, OPAL, CEDAR, AVP, openFGA, ...) as well as the Permit Service.

- Manage the Permit PDP and perform permissions checks directly from the CLI
- Manage the Permit API
- Interact with OPA (Open Policy Agent)
- Coming Soon: Interact with OPAL
- Coming Soon: Interact with Cedar-Agent
- Coming Soon: Interact with OpenFGA

### This tool is in early stages of development

Give this Repo a ⭐ to support and stay updated

Based on [Pastel](https://github.com/vadimdemedes/create-pastel-app)

## Run for development

- Checkout this repo
- run `npm install`
- run `npx tsx ./source/cli.tsx`

### Writing Tests
Permit CLI uses [`vitest`](https://vitest.dev/) as a tool for writing tests. It also uses [`ink-testing-library`](https://github.com/vadimdemedes/ink-testing-library) to render the `Ink` components. 

- run `npx vitest` for testing
- run `npx vitest --coverage` for code coverage.


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
