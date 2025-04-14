import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface OpenapiFormProps {
  inputPath: string;
  setInputPath: (path: string) => void;
  onSubmit: () => void;
}

/**
 * Form component for entering the OpenAPI spec file path
 */
export default function OpenapiForm({
  inputPath,
  setInputPath,
  onSubmit,
}: OpenapiFormProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text>Enter the path to your OpenAPI spec file:</Text>
      <Box>
        <TextInput
          value={inputPath}
          onChange={setInputPath}
          onSubmit={onSubmit}
          placeholder="Path to local file or URL (e.g., ./openapi.json or https://example.com/api.json)"
        />
      </Box>
    </Box>
  );
}