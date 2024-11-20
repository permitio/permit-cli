import React, { useState } from 'react';
import { Text } from 'ink';
import { saveAuthToken } from '../lib/auth.js';
import { LoginFlow } from '../components/LoginFlow.js';
import { EnvironmentSelection } from '../components/EnvironmentSelection.js';
import { options } from '../options.js';
import { type infer as zInfer } from 'zod';

type Props = {
  readonly options: zInfer<typeof options>;
};

export default function Login({ options }: Props) {
  // State management
  const [error, setError] = useState('');
  const [accessToken, setAccessToken] = useState<string>();
  const [cookie, setCookie] = useState<string>('');
  const [isComplete, setIsComplete] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [selectedEnv, setSelectedEnv] = useState<string>('');

  /**
   * Handler for successful login completion
   * Stores the access token and cookie for subsequent API calls
   */
  const handleLoginComplete = (token: string, cookieValue: string) => {
    setAccessToken(token);
    setCookie(cookieValue);
  };

  /**
   * Handler for environment selection completion
   * Saves the API key to the keychain and updates completion state
   */
  const handleEnvironmentComplete = async (apiKey: string, orgName: string, envName: string) => {
    try {
      await saveAuthToken(apiKey);
      setSelectedOrg(orgName);
      setSelectedEnv(envName);
      setIsComplete(true);
    } catch (error) {
      setError('Failed to save authentication token');
    }
  };

  // Error display
  if (error) {
    return <Text color="red">{error}</Text>;
  }

  // Completion message
  if (isComplete) {
    return (
      <Text>
        Logged in as {selectedOrg} with selected environment as{' '}
        {selectedEnv || 'None'}
      </Text>
    );
  }

  // Conditional rendering based on authentication state
  return accessToken ? (
    <EnvironmentSelection
      accessToken={accessToken}
      cookie={cookie}
      onComplete={handleEnvironmentComplete}
      workspace={options.workspace}
    />
  ) : (
    <LoginFlow
      options={options}
      onLoginComplete={handleLoginComplete}
      onError={setError}
    />
  );
}

export { options };