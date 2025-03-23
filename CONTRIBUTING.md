# Contributing Guide

We would love for you to contribute to this project and help make it even better than it is today! 💎

As a contributor, here are the guidelines we would like you to follow:

- [General Guidelines](#general-guidelines)
- [New Commands Guidelines](#new-command-guidelines)
- [Code of Conduct](https://github.com/permitio/permit-cli/blob/master/CODE_OF_CONDUCT.md)
- [Question or Problem?](#question)
- [Issues and Bugs](#issue)
- [Feature Requests](#feature)

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
- The `src/lib` folder is for utility functions used across the project. Functions there should be completely pure and not depend on any external state.
- All the static configuration variables should be placed in the `config.tsx` file.


## New Command Guidelines
For new commands, we have a few guidelines to ensure consistency and maintainability:
- Command files (placed in `src/commands`), should contain only the argument configuration, and a root command component
- Here are some common guidelines that should be followed when creating a new command:
   - Should be wrapped with the `AuthProvider` component, to ensure the user is authenticated before running the command.
   - Should have an optional `apiKey` argument that allow the user to pass the API key to the command instead of using the login flow provided by the `AuthProvider` component.
   - Should declare the API key scope required for the command (can be `organization`, `project`, or `environment`).
   - Should have concise documentation in the Readme file, explaining the command, its arguments, and how to use it.
   - Should have a `description` and `options` object that defines the command's description and arguments.


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

We aim to review all PRs promptly. After you submit a PR, here’s what you can expect:

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

# AuthProvider Component Documentation

## **Overview**

The `AuthProvider` component is a React context provider designed to manage authentication, authorization, and API key handling for CLI-based workflows. It handles multiple flows, such as login, API key validation, token management, and organization/project/environment selection.

This component is the backbone of authentication for the CLI app. It ensures a smooth and secure authentication process by abstracting away the complexities of API key creation, validation, and token management.

---

## **What It Does**

### **Authentication Flows**

1. **Token Validation:**

   - It attempts to load an existing authentication token using `loadAuthToken()`.
   - If a token exists but has the wrong scope or is invalid, the user is redirected to reauthenticate.

2. **API Key Validation:**

   - The component validates the provided `--key` (if supplied) against the required scope (e.g., organization, project, or environment).
   - If invalid, it throws an error.

3. **Token Creation and Management:**
   - If no key is provided or no stored key is found, we take the user through appropriate selection flow, and get a token of that scope.
   - If while fetching the token, no valid key with name (`CLI_API_Key`) is found, the component handles the creation of a new API key (`CLI_API_Key`), ensuring it is scoped appropriately.

### **User Prompts**

- Prompts users to select an organization or project if required and dynamically handles state transitions based on the user's input.

### **Error Handling**

- Any error in the authentication flow (e.g., invalid token, API failure) is captured and displayed to the user. If an error is critical, the CLI exits with a non-zero status.

---

## **Key Features**

1. **`--api-key<-->permitKey` Functionality:**

   - Users can pass a `--key` flag to provide an API key directly to the `permitKey` prop of `AuthProvider`. The component validates the key and uses it if valid + has a valid scope.
   - If not passed, the component tries to load a previously stored token or guides the user through a scope based selection and key creation flow.

2. **Scope Handling:**

   - The `scope` prop defines the required level of access (e.g., `organization`, `project`, or `environment`).
   - Based on the scope, the component dynamically fetches or validates the key.

3. **Key Creation:**

   - If on an organization/project scope level, we fetch the key, and we don't find a `CLI_API_Key`, we create one for the user and notify them that it's a secure token and not to edit it in any way.

4. **Error and Loading Indicators:**
   - Displays appropriate messages during loading or error states to ensure users are informed about what’s happening.

---

## **How to Use It**

- Any component that is wrapped with AuthProvider can use `useAuth()` to access:

```tsx
type AuthContextType = {
	authToken: string;
	loading: boolean;
	error?: string | null;
	scope: ApiKeyScope;
};
```

1. **Wrap Your Application:**

   - The `AuthProvider` should wrap the root of your CLI app. It ensures that authentication is initialized before the app runs.

   ```tsx
   import { AuthProvider } from './context/AuthProvider';

   const App = () => (
   	<AuthProvider scope="project">
   		{' '}
   		// The scope here is optional and defaults to environment
   		<YourCLICommands />
   	</AuthProvider>
   );
   ```

2. **Access Authentication Context:**

   - Use the `useAuth` hook to access the `authToken` and other authentication states in your components.

   ```tsx
   import { useAuth } from './context/AuthProvider';

   const MyCommand = () => {
   	const { authToken, loading, error, scope } = useAuth();

   	if (loading) {
   		return <Text>Loading...</Text>;
   	}

   	if (error) {
   		return <Text>Error: {error}</Text>;
   	}

   	return <Text>Authenticated with token: {authToken}</Text>;
   };
   ```

3. **Customizing Behavior:**
   - Pass the `permit_key` or `scope` prop to customize the authentication flow.
   - Example:
     ```tsx
     <AuthProvider permit_key="my-key" scope="organization">
     	<YourCLICommands />
     </AuthProvider>
     ```

---

## **What Happens Inside**

### **Step-by-Step Breakdown**

1. **Initialization:**

   - Checks if a `permit_key` or token is already available.
   - Validates the token against the required `scope`.

2. **Token Validation:**

   - If invalid or missing, it guides the user through organization/project/environment selection.

3. **API Key Handling:**

   - Searches for an existing `CLI_API_Key` scoped to the organization/project.
   - Creates one if it doesn’t exist and retrieves its secret.

4. **State Transition:**

   - Handles transitions between `loading`, `login`, `organization`, `project`, and `done` states based on user input and validation results.

5. **Error Handling:**
   - Displays errors and exits the process if authentication fails irrecoverably.

---

# useClient Hook Documentation

## Overview

All three clients are a wrapper over `openapi-fetch` clients. These provide excellent typescript safety features.

The `useClient` hook exposes three methods to make api calls
1. `authenticatedApiClient`: If your component is wrapped in an `AuthProvider` use this method, it takes the context for `org_id`, `proj_id`, `env_id` and injects it in your path if needed. It also has the context for the `authToken` and you don't need to pass it to this method.
2. `authenticatedPdpClient`: Same functionality as `authenticatedApiClient` but you can pass an optional `pdp_url` while initializing the hook, otherwise it defaults to `https://cloudpdp.api.permit.io`.
3. `unAuthenticatedApiClient`: This is your normal api client, you need to pass all the necessary parameters manually.


## How to use it
All three of them are used in the same way, albeit having different use cases.
   1. Syntax:
      ```tsx
      const { authenticatedApiClient } = useClient();
      await authenticatedApiClient().POST(`path/xyz/{dynamic}`, // path
      	{ dynamic: 'dynamic_value' }, // path_values
      	{ key: value, uwu: owo}, // body
      	{ page: 10 } //query
      )
      ```
   2. Example:
	   ```tsx
       const { authenticatedApiClient } = useClient();
	   await authenticatedApiClient().GET(`/v2/api-key/{proj_id}/{env_id}`,
   		  { env_id: environmentId }
   	   )
	   ```
