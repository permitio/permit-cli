import React, { useEffect, useState } from 'react';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { loadAuthToken } from '../../lib/auth.js';
import { API_PDPS_CONFIG_URL } from '../../config.js';

const execAsync = promisify(exec);

type Props = {
  opa?: number;
  printCommand?: boolean;
};

export default function PDPRunComponent({ opa, printCommand = false }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dockerCommand, setDockerCommand] = useState<string>('');
  const [containerOutput, setContainerOutput] = useState<string>('');
  const [containerRunning, setContainerRunning] = useState(false);

  useEffect(() => {
    const generateDockerCommand = async () => {
      try {
        setLoading(true);
        
        // Get the auth token
        const token = await loadAuthToken();
        
        // Fetch PDP configuration
        const response = await fetch(API_PDPS_CONFIG_URL, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch PDP configuration: ${response.statusText}`);
        }
        
        const config = await response.json();
        
        // Generate the Docker command
        const cmd = `docker run -p 7676:7676 ${
          opa ? `-p ${opa}:8181` : ''
        } -e PDP_API_KEY=${token} -e PDP_CONTROL_PLANE=${config.controlPlane || 'https://api.permit.io'} permitio/pdp-v2:latest`;
        
        setDockerCommand(cmd);
        
        if (!printCommand) {
          // Check if Docker is installed
          try {
            await execAsync('docker --version');
          } catch (err) {
            throw new Error('Docker is not installed or not in PATH. Please install Docker to run the PDP container.');
          }
          
          // Run the Docker command
          try {
            setLoading(true);
            // Use exec to start the process but don't wait for it to complete
            const childProcess = exec(cmd);
            
            setContainerRunning(true);
            
            // Capture stdout
            childProcess.stdout?.on('data', (data) => {
              setContainerOutput(prev => prev + data);
            });
            
            // Capture stderr
            childProcess.stderr?.on('data', (data) => {
              // Some Docker output goes to stderr but isn't an error
              if (data.includes('Error')) {
                setError(data);
              } else {
                setContainerOutput(prev => prev + data);
              }
            });
            
            // Handle process exit
            childProcess.on('exit', (code) => {
              if (code !== 0) {
                setError(`Docker process exited with code ${code}`);
                setContainerRunning(false);
              }
            });
            
            // Handle process error
            childProcess.on('error', (err) => {
              setError(`Failed to start Docker: ${err.message}`);
              setContainerRunning(false);
            });
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            throw new Error(`Failed to run Docker command: ${errorMessage}`);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };
    
    generateDockerCommand();
    
    // Cleanup function to handle component unmounting
    return () => {
      // If we started a Docker container and component is unmounting, we might want to stop it
      // This depends on the desired behavior - if you want the container to keep running, omit this
      if (containerRunning && !printCommand) {
        try {
          exec('docker stop $(docker ps -q --filter ancestor=permitio/pdp-v2:latest)');
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [opa, printCommand]);

  if (loading) {
    return (
      <Box>
        <Text>
          <Spinner type="dots" /> {printCommand ? 'Generating Docker command...' : 'Starting PDP Docker container...'}
        </Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
        {!printCommand && (
          <Text>Make sure Docker is installed and running on your system.</Text>
        )}
      </Box>
    );
  }

  if (printCommand) {
    return (
      <Box flexDirection="column">
        <Text>Run the following command to start the PDP container:</Text>
        <Text>{dockerCommand}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text>PDP container is running on port 7676{opa ? ` with OPA exposed on port ${opa}` : ''}</Text>
      <Text>Press Ctrl+C to stop the CLI (the container will continue running)</Text>
      {containerOutput && (
        <Box flexDirection="column" marginTop={1}>
          <Text>Container output:</Text>
          <Text>{containerOutput}</Text>
        </Box>
      )}
    </Box>
  );
}