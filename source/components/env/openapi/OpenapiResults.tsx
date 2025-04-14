import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

interface OpenapiResultsProps {
  status: 'loading' | 'error' | 'success';
  error: string | null;
  progress: string;
  processingDone: boolean;
}

/**
 * Component for displaying processing status and results
 */
export default function OpenapiResults({
  status,
  error,
  progress,
  processingDone,
}: OpenapiResultsProps): React.ReactElement {
  // Loading state
  if (status === 'loading' && !processingDone) {
    return (
      <Box>
        <Text>
          <Spinner type="dots" /> {progress || 'Processing...'}
        </Text>
      </Box>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
        <Text>Please try again with a valid OpenAPI spec file.</Text>
      </Box>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <Box flexDirection="column">
        <Text color="green">✓ OpenAPI spec successfully applied!</Text>
        <Text>
          Resources, actions, roles, and URL mappings have been created based on
          the OpenAPI spec.
        </Text>
      </Box>
    );
  }

  // Unexpected state fallback
  return <Text>Unexpected state. Please try again.</Text>;
}