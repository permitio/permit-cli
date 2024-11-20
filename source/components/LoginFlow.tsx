import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import Spinner from 'ink-spinner';
import { TokenType, tokenType, browserAuth, authCallbackServer } from '../lib/auth.js';
import { apiCall } from '../lib/api.js';

interface LoginFlowProps {
  options: {
    key?: string;
    workspace?: string;
  };
  onLoginComplete: (token: string, cookie: string) => void;
  onError: (error: string) => void;
}

export const LoginFlow: React.FC<LoginFlowProps> = ({ 
  options: { key }, 
  onLoginComplete, 
  onError 
}) => {
  // Loading state for UI feedback
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Authentication effect that runs on mount
   * Handles both API key validation and browser-based auth flow
   */
  useEffect(() => {
    const authenticate = async () => {
      try {
        setIsLoading(true);
        if (key) {
          // API key authentication path
          if (tokenType(key) === TokenType.APIToken) {
            onLoginComplete(key, '');
          } else {
            onError('Invalid API Key');
          }
        } else {
          // Browser-based authentication path
          const verifier = await browserAuth();
          const token = await authCallbackServer(verifier);
          const { headers } = await apiCall('v2/auth/login', token, '', 'POST');
          const cookie = headers.getSetCookie()?.[0] || '';
          onLoginComplete(token, cookie);
        }
      } catch (error) {
        onError(error instanceof Error ? error.message : 'Authentication failed');
      } finally {
        setIsLoading(false);
      }
    };

    authenticate();
  }, [key, onLoginComplete, onError]);

  // Render loading spinner or initial message
  return (
    <>
      {isLoading ? (
        <Text>
          <Spinner type="dots" /> Logging in...
        </Text>
      ) : (
        <Text>Login to Permit</Text>
      )}
    </>
  );
};