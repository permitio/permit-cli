import React, { useState, useEffect } from 'react';
import OpenapiForm from './OpenapiForm.js';
import OpenapiResults from './OpenapiResults.js';
import { useOpenapiProcessor } from './OpenapiProcessor.js';

interface OpenapiComponentProps {
  specFile?: string;
}

/**
 * Main component for the OpenAPI spec processing
 * 
 * This component coordinates the form, processing, and results display.
 */
export default function OpenapiComponent({
  specFile,
}: OpenapiComponentProps): React.ReactElement {
  // State management
  const [status, setStatus] = useState<
    'init' | 'loading' | 'error' | 'success'
  >('init');
  const [inputPath, setInputPath] = useState<string>(specFile || '');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [processingDone, setProcessingDone] = useState(false);

  // Get the processor hook
  const { processSpec } = useOpenapiProcessor({
    inputPath,
    setProgress,
    setStatus,
    setError,
    setProcessingDone,
  });

  // Handle form submission
  const handleSubmit = () => {
    if (!inputPath) {
      setError('Please enter a valid file path or URL');
      return;
    }

    setStatus('loading');
    setProgress('Starting to process OpenAPI spec...');

    // Process the OpenAPI spec
    processSpec();
  };

  // Run processing when specFile is provided initially
  useEffect(() => {
    if (specFile && status === 'init') {
      setInputPath(specFile);
      setStatus('loading');
      setProgress('Starting to process OpenAPI spec...');
      processSpec();
    }
  }, [specFile, status, processSpec]);

  // Render the appropriate component based on the status
  if (status === 'init') {
    return (
      <OpenapiForm
        inputPath={inputPath}
        setInputPath={setInputPath}
        onSubmit={handleSubmit}
      />
    );
  }

  // For all other states, show the results component
  return (
    <OpenapiResults
      status={status}
      error={error}
      progress={progress}
      processingDone={processingDone}
    />
  );
}