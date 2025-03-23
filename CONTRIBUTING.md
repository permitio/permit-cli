# Contributing Guide

We would love for you to contribute to this project and help make it even better than it is today! 💎

As a contributor, here are the guidelines we would like you to follow:

- [General Guidelines](#general-guidelines)
- [New Commands Guidelines](#new-command-guidelines)
- [Issue / Bounty Participation Guidelines](#issue-bounty-participation-guidelines)
- [Code of Conduct](https://github.com/permitio/permit-cli/blob/master/CODE_OF_CONDUCT.md)
- [Question or Problem?](#question)
- [Issues and Bugs](#issue)
- [Feature Requests](#feature)
- [The AuthProvider and `useClient` Hook](#authprovider-and-useclient-hook)

## General Guidelines
- We are encouraging the usage of AI in the development process, but we also require the human engineering touch on PRs. Every "blind" AI PR will be rejected.
- Permit CLI is based on Pastel.js, and the file structure should adhere the Pastel.js file structure and best practices - to read more about Pastel.js, please visit [Pastel.js](https://github.com/vadimdemedes/pastel?tab=readme-ov-file#table-of-contents) repository.
- The project is using typescript and we are using the strict mode, so please make sure to follow the typescript rules. No `any` types are allowed in general.
- The project is using ESLint and Prettier for linting and formatting, and Vitest for testing. 
- All the PRs should pass the lint rules, and provide >90% test coverage of the new code.


### File Structure
- Commands should be placed in the `src/commands` directory. For more guidelines, please refer to the [New Command Guidelines](#new-command-guidelines).
- Components should be placed in the `src/components` directory. Components should be reusable by other commands and should be well documented.
- API Calls should be placed only in hooks, which should be in the `src/hooks` directory. The hooks should be well documented and reusable by other components.
   - All the API calls should be made using the `useClient` hook. The hook is working with the `AuthProvider` component, so you don't need to pass the `authToken` to the API calls.
   - Read more about the `useClient` hook in the [The AuthProvider and useClient Hook](#authprovider-and-useclient-hook) section.
   - The `useClient` has loaded with all the API spec and conventions, so you don't need to worry about constructing the API calls.
- The `src/lib` folder is for utility functions used across the project. Functions there should be completely pure and not depend on any external state.
- All the static configuration variables should be placed in the `config.tsx` file.


## New Command Guidelines
For new commands, we have a few guidelines to ensure consistency and maintainability:
- Command files (placed in `src/commands`), should contain only the argument configuration, and a root command component
- The command component should be a single component, with a declarative name
- Here are some common guidelines that should be followed when creating a new command:
   - Should be wrapped with the `AuthProvider` component, to ensure the user is authenticated before running the command. Read more about the `AuthProvider` component in the [The AuthProvider and useClient Hook](#authprovider-and-useclient-hook) section.
   - Should have an optional `apiKey` argument that allow the user to pass the API key to the command instead of using the login flow provided by the `AuthProvider` component.
   - Should declare the API key scope required for the command (can be `organization`, `project`, or `environment`).
   - Should have concise documentation in the Readme file, explaining the command, its arguments, and how to use it.
   - Should have a `description` and `options` object that defines the command's description and arguments.

### <a name="api-proxy-commands"></a> "API Proxy" Commands
Some of the commands, just proxy API endpoints without any extra logic. For these commands, we are asking to keep the command as simple as possible, and to use the `useClient` hook to make the API calls.

The command behavior should be as follows:
- All the spec and convention is available in the `useClient` hook, so you don't need to worry about constructing the API calls.
- The project/environment that are part of the endpoint **shouldn't** be passed as an argument to the command. The `useClient` hook will automatically inject the project/environment ID to the endpoint.
- Mandatory and optional fields are defined in the API spec, and should be reflected in the command arguments.
- Permit API spec is available at [Permit API Spec](https://api.permit.io/v2/redoc) and the PDP API spec is available at [Permit PDP API Spec](https://pdp-api.permit.io/redoc)
- All the endpoint components, query string parameters, and body should be accepted as arguments to the command and promptable in the command wizard.
- Command wizard flow should be as follows:
   - If all mandatory fields appear in the arguments, do not open a wizard and run the command
   - If some mandatory fields are missing in the argument, prompt the wizard with the possibility to skip when fields that are optional

### Command TSX Structure

The following is a template of a new command. Nothing should be changed or added to this template but the arguments and the root command component.

```tsx
import React from 'react';
import zod from 'zod';
import { option } from 'pastel';
import { AuthProvider } from '../../../components/AuthProvider';
// Add the command component import here

export const description =
	'Short and concise description of the command';

export const options = zod.object({
	key: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'The API key for the permit',
				alias: 'k',
			}),
		),
   // Add more options here
});

type Props = {
	options: zod.infer<typeof options>;
};

export default function GitHub({ options }: Props) {
	return (
		<AuthProvider permit_key={options.apiKey} scope={'the_scope_requires_for_this_command'}> // The scope can be organization, project, or environment
         {/* Add the command component here. Should be single component, with declarative name */}
			<CommandComponent />
		</AuthProvider>
	);
}
```


## Issue / Bounty Participation Guidelines
- To get an issue assigned, you need to present a clear plan of action and a clear timeline for the issue.
- If you are not sure about the issue, you can ask for clarifications in the issue comments.
- Before starting to work on an issue, you need to get it approved and assigned by the maintainers.
- If the issue has a bounty, you also need to add your relevant experience in the domain of the issue to your PR description.
- Due to the exponential growth of blind AI PRs and issue participation, every PR that is considered an AI submission will be rejected without further notice.


### Admissions
- We are using [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for our commit messages.
- We are using [Semantic Versioning](https://semver.org/) for our releases.
- We try to follow the BetterCLI guidelines, and we are using the [BetterCLI](https://bettercli.dev/) for our CLI development.


## <a name="question"></a> Got a Question or Problem?

Come talk to us about Permit CLI, or authorization in general - we would love to hear from you ❤️

You can:

- Raise questions in our [GitHub discussions](https://github.com/permitio/permit-cli/discussions)
- Report issues and ask for features in [GitHub issues](https://github.com/permitio/permit-cli/issues)
- Follow us on [Twitter](https://twitter.com/permit_io) to get the latest Permit CLI updates
- Join our [Slack community](https://io.permit.io/slack) to chat about authorization, open-source, realtime communication, tech or anything else! We are super available on Slack ;)

If you are using our project, please consider giving us a ⭐️

### <a name="issue"></a> Found a Bug?

If you find a bug in the source code, you can help us by [submitting an issue](https://github.com/permitio/permit-cli/issues) or even better, you can [submit a Pull Request](#submit-pr) with a fix.

Before you submit an issue, please search the issue tracker; maybe an issue for your problem already exists, and the discussion might inform you of workarounds readily available.

We want to fix all the issues as soon as possible, but before fixing a bug, we need to reproduce and confirm it.
In order to reproduce bugs, we require that you provide a full loom or other kind of terminal recording, so we can understand the issue and reproduce it.

### <a name="feature"></a> Missing a Command / Feature?

You can _request_ a new feature by [submitting an issue](https://github.com/permitio/permit-cli/issues) to our GitHub Repository.
Please provide as much detail and context as possible, along with examples or references to similar features, as this will help us understand your request better.

We encourage you to contribute to Permit CLI by submitting a [Pull Request](#submit-pr) with your feature implementation and are happy to guide you through the process.

We are always looking to improve Permit CLI and would love to hear your ideas!

### <a name="submit-pr"></a> Submitting a Pull Request (PR)

Pull requests are welcome! 🙏

Please follow these guidelines:

1. **Create an Issue**: Open a [GitHub Issue](https://github.com/permitio/permit-cli/issues) for your feature or bug fix.
2. **Fork & Branch**: Fork this repository and create a new branch based on `main`. Name your branch descriptively (e.g., `fix/issue-123`, `feature/new-fetch-provider`).
3. **Write Tests**: If your changes affect functionality, include tests.
4. **Update Documentation**: Ensure any new features or configurations are documented.
5. **Check Quality**: Run all tests and linters:
   ```bash
   npm run lint
   npm run test
   ```
6. **Submit PR**: Open a pull request, linking to the issue and explaining your changes clearly.

We aim to review all PRs promptly. After you submit a PR, here's what you can expect:

1. **Initial Review:** A maintainer will review your PR within a few days. If there are any issues, they will provide feedback.
2. **Feedback:** If changes are needed, please make the necessary updates and push them to your branch. The PR will be updated automatically.
3. **Approval:** Once your PR is approved, it will be merged into the main branch.
4. **Release:** Your changes will be included in the next release of Permit CLI. We will update the changelog and release notes accordingly.
5. **Announcement:** We will announce your contribution in our community channels and give you a shoutout! 🎉

### Contributor Checklist

Before submitting your contribution, ensure the following:

- [ ] Issue created and linked in the PR
- [ ] Branch created from `main` and appropriately named
- [ ] Tests written and passing
- [ ] Documentation updated (if applicable)
- [ ] Code formatted and linted
- [ ] Changes thoroughly explained in the PR description


## <a name="authprovider-and-useclient-hook"></a> The AuthProvider and useClient Hook

### Overview

The `AuthProvider` component and `useClient` hook work together to simplify authentication for CLI commands. This pairing handles authentication flows, token management, and provides pre-authenticated API clients.

### AuthProvider Component

The `AuthProvider` wraps your command component and manages authentication state:

```tsx
<AuthProvider permit_key={options.apiKey} scope="project">
  <YourCommandComponent />
</AuthProvider>
```

**Key properties:**
- `permit_key`: Optional API key from command options
- `scope`: Required access level (`"organization"`, `"project"`, or `"environment"`)
- Automatically handles token validation, API key creation, and resource selection

### useClient Hook

The `useClient` hook provides pre-authenticated API clients that leverage the AuthProvider context:

```tsx
import { useClient } from '../hooks/useClient';

// Inside your component
const { authenticatedApiClient } = useClient();
```

**Available clients:**
1. `authenticatedApiClient`: Uses AuthProvider context for authentication
2. `authenticatedPdpClient`: Same as above but for PDP endpoints
3. `unAuthenticatedApiClient`: For commands and components that potentially do not wrapped with the `AuthProvider` (e.g. `login`)

### How They Work Together

When your component is wrapped with `AuthProvider`, the `useClient` hook automatically has access to authentication context, eliminating the need to handle tokens manually:

```tsx
// Command file
export default function MyCommand({ options }) {
  return (
    <AuthProvider permit_key={options.apiKey} scope="project">
      <MyImplementation />
    </AuthProvider>
  );
}

// Component implementation
function MyImplementation() {
  const { authenticatedApiClient } = useClient();
  
  // API calls are automatically authenticated
  const fetchData = async () => {
    const response = await authenticatedApiClient().GET('/v2/endpoint/{proj_id}');
    // {proj_id} is automatically injected from context
    
    if (response.error) {
      // Handle error
    }
    return response.data;
  };
  
  // Component logic
}
```

### API Call Pattern

All client methods follow this pattern:

```tsx
await client().METHOD(
  path,           // URL path with optional {placeholders}
  pathParams?,    // Values for path parameters (many are auto-injected)
  body?,          // Request body (for POST/PUT/PATCH)
  queryParams?    // URL query parameters
)
```

**Example API calls:**

```tsx
// GET request
const response = await authenticatedApiClient().GET('/v2/resources/{proj_id}/{env_id}');

// POST with body
await authenticatedApiClient().POST(
  '/v2/resources/{proj_id}/{env_id}',
  {}, // Path params auto-injected
  { name: 'resource-name', type: 'resource-type' }
);

// With query parameters
await authenticatedApiClient().GET(
  '/v2/search/{proj_id}',
  {}, // Path params auto-injected
  undefined, // No body for GET
  { query: 'search-term', page: 2 }
);
```

By using this pattern, you can focus on your command's business logic without worrying about authentication details.
