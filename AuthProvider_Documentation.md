
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
1. **`--key<-->permitKey` Functionality:**
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
       <AuthProvider scope="project"> // The scope here is optional and defaults to environment
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
