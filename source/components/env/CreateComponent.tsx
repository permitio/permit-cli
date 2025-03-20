import React, { useCallback, useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import SelectInputComponent from 'ink-select-input';
import TextInput from 'ink-text-input';
import { useAuth } from '../AuthProvider.js';
import { useProjectAPI } from '../../hooks/useProjectAPI.js';
import { useEnvironmentApi } from '../../hooks/useEnvironmentApi.js';

interface Project {
  id: string;
  key: string;
  name: string;
}

interface SelectItem {
  label: string;
  value: string;
}

type CreateComponentProps = {
  projectId?: string;
  name?: string;
  envKey?: string;
  description?: string;
};

export default function CreateComponent({
  projectId,
  name: initialName,
  envKey: initialKey,
  description: initialDescription,
}: CreateComponentProps) {
  const { authToken, scope, loading } = useAuth();
  const cookie = null;
  const { getProjects } = useProjectAPI();
  const { createEnvironment } = useEnvironmentApi();
  
  const [step, setStep] = useState<
    'loading' | 'project_select' | 'name_input' | 'key_input' | 'description_input' | 'creating' | 'done' | 'error'
  >('loading');
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  const [name, setName] = useState<string>(initialName || '');
  const [key, setKey] = useState<string>(initialKey || '');
  const [description, setDescription] = useState<string>(initialDescription || '');
  const [createdEnvironmentId, setCreatedEnvironmentId] = useState<string>('');

  // Load projects
  useEffect(() => {
    const fetchProjects = async () => {
      if (!authToken) {
        setError('No auth token available');
        setStep('error');
        return;
      }

      try {
        const { response, error } = await getProjects(authToken, cookie);
        if (error) {
          setError(`Failed to fetch projects: ${error}`);
          setStep('error');
          return;
        }

        if (response.length === 0) {
          setError('No projects found. Please create a project first.');
          setStep('error');
          return;
        }

        setProjects(response);

        // If projectId is provided, select it directly
        if (projectId) {
          const project = response.find(p => p.id === projectId);
          if (project) {
            setSelectedProject(project);
            
            // If we have all the required inputs, move to the creating step
            if (initialName && (initialKey || initialName)) {
              setStep('creating');
            } else if (initialName) {
              // If we have a name but no key, derive the key and go to key input
              const derivedKey = initialName
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '_');
              setKey(derivedKey);
              setStep('key_input');
            } else {
              setStep('name_input');
            }
          } else {
            setError(`Project with ID ${projectId} not found`);
            setStep('project_select');
          }
        } else {
          setStep('project_select');
        }
      } catch (err) {
        setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
        setStep('error');
      }
    };

    if (step === 'loading') {
      fetchProjects();
    }
  }, [authToken, cookie, getProjects, projectId, step, initialName, initialKey]);

  // Project selection handler
  const handleProjectSelect = useCallback((item: SelectItem) => {
    const project = projects.find(p => p.id === item.value);
    if (project) {
      setSelectedProject(project);
      setStep('name_input');
    }
  }, [projects]);

  // Handle name submission
  const handleNameSubmit = useCallback((value: string) => {
    setName(value);
    // Derive a key from the name if not provided
    if (!key) {
      const derivedKey = value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_');
      setKey(derivedKey);
    }
    setStep('key_input');
  }, [key]);

  // Handle key submission
  const handleKeySubmit = useCallback((value: string) => {
    setKey(value);
    setStep('description_input');
  }, []);

  // Handle description submission
  const handleDescriptionSubmit = useCallback((value: string) => {
    setDescription(value);
    setStep('creating');
  }, []);

  // Create the environment
  useEffect(() => {
    const create = async () => {
      if (!selectedProject || !authToken) {
        setError('Missing project or authentication');
        setStep('error');
        return;
      }

      try {
        const { response, error } = await createEnvironment(
          selectedProject.id,
          authToken,
          cookie,
          {
            name,
            key,
            description: description || undefined,
          }
        );

        if (error) {
          setError(`Failed to create environment: ${error}`);
          setStep('error');
          return;
        }

        setCreatedEnvironmentId(response.id);
        setStep('done');
        
        // Add a short delay before exiting to ensure the output is visible
        setTimeout(() => {
          process.exit(0);
        }, 500);
      } catch (err) {
        setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
        setStep('error');
      }
    };

    if (step === 'creating') {
      create();
    }
  }, [step, selectedProject, authToken, cookie, name, key, description, createEnvironment]);

  if (step === 'loading') {
    return (
      <Box>
        <Text>
          <Spinner type="dots" /> Loading projects...
        </Text>
      </Box>
    );
  }

  if (step === 'project_select') {
    return (
      <Box flexDirection="column">
        <Text>Select a project:</Text>
        <SelectInputComponent
          items={projects.map(project => ({
            label: `${project.name} (${project.key})`,
            value: project.id,
          }))}
          onSelect={handleProjectSelect}
        />
      </Box>
    );
  }

  if (step === 'name_input') {
    return (
      <Box flexDirection="column">
        <Text>Enter environment name:</Text>
        <TextInput value={name} onChange={setName} onSubmit={handleNameSubmit} />
      </Box>
    );
  }

  if (step === 'key_input') {
    return (
      <Box flexDirection="column">
        <Text>Enter environment key (or press Enter to use the suggested key):</Text>
        <TextInput value={key} onChange={setKey} onSubmit={handleKeySubmit} />
        <Text dimColor>Keys should only contain lowercase letters, numbers, and underscores.</Text>
      </Box>
    );
  }

  if (step === 'description_input') {
    return (
      <Box flexDirection="column">
        <Text>Enter environment description (optional):</Text>
        <TextInput value={description} onChange={setDescription} onSubmit={handleDescriptionSubmit} />
      </Box>
    );
  }

  if (step === 'creating') {
    return (
      <Box>
        <Text>
          <Spinner type="dots" /> Creating environment...
        </Text>
      </Box>
    );
  }

  if (step === 'done') {
    return (
      <Box flexDirection="column">
        <Text>✅ Environment created successfully!</Text>
        <Text>Environment ID: {createdEnvironmentId}</Text>
        <Text>Name: {name}</Text>
        <Text>Key: {key}</Text>
        {description && <Text>Description: {description}</Text>}
        <Text>Project: {selectedProject?.name} ({selectedProject?.key})</Text>
      </Box>
    );
  }

  // Error state
  if (step === 'error') {
    // Exit after a short delay on error
    setTimeout(() => {
      process.exit(1);
    }, 500);
    
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }
}