import React from 'react';
import Gradient from 'ink-gradient';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';
import { useAuthStatus } from '../hooks/useAuthStatus.js';

const LoadingView: React.FC = () => (
  <Box>
    <Text>
      <Spinner type="dots" /> Checking authentication status...
    </Text>
  </Box>
);

interface LoggedInViewProps {
  organization: { id: string; name: string };
  project: { id: string; name: string } | null;
  environment: { id: string; name: string } | null;
}

const LoggedInView: React.FC<LoggedInViewProps> = ({ organization, project, environment }) => (
  <Box flexDirection="column">
    <Text><Gradient colors={['#FF923F', '#944EEF']}>Permit CLI</Gradient> is a developer swiss army knife for fine-grained authorization</Text>
    <Text>{'\n'}</Text>
    <Text>You are logged in to:</Text>
    <Text>• Organization: {organization.name || organization.id}</Text>
    {project && <Text>• Project: {project.name || project.id}</Text>}
    {environment && <Text>• Environment: {environment.name || environment.id}</Text>}
    <Text>{'\n'}</Text>
    <Text>Run this command with --help for more information</Text>
  </Box>
);

const LoggedOutView: React.FC = () => (
  <Box flexDirection="column">
    <Text><Gradient colors={['#FF923F', '#944EEF']}>Permit CLI</Gradient> is a developer swiss army knife for fine-grained authorization. Use <Text bold color="green">permit login</Text> to get started.</Text>
    <Text>{'\n'}</Text>
    <Text>Run this command with --help for more information</Text>
  </Box>
);

interface ErrorViewProps {
  error: string;
}

const ErrorView: React.FC<ErrorViewProps> = ({ error }) => (
  <Box marginTop={1}>
    <Text color="red">Error: {error}</Text>
  </Box>
);

const Index: React.FC = () => {
  // Custom hook that handles all auth-related logic
  const { loading, loggedIn, authData, error } = useAuthStatus();
  
  if (loading) {
    return <LoadingView />;
  }
  
  return (
    <Box flexDirection="column">
      {loggedIn ? (
        <LoggedInView 
          organization={authData.organization}
          project={authData.project}
          environment={authData.environment}
        />
      ) : (
        <LoggedOutView />
      )}
      
      {error && <ErrorView error={error} />}
    </Box>
  );
};

export default Index;