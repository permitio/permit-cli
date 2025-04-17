import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import OpenapiResults from '../../../../source/components/env/openapi/OpenapiResults.js';

describe('OpenapiResults', () => {
  it('should show loading spinner and progress message when loading', () => {
    const { lastFrame } = render(
      <OpenapiResults 
        status="loading" 
        error={null} 
        progress="Loading OpenAPI spec..." 
        processingDone={false} 
      />
    );

    expect(lastFrame()).toContain('Loading OpenAPI spec...');
    // Note: Spinner character might vary depending on the platform
    expect(lastFrame()).toMatch(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/);
  });

  it('should show error message when status is error', () => {
    const { lastFrame } = render(
      <OpenapiResults 
        status="error" 
        error="Failed to parse OpenAPI spec" 
        progress="" 
        processingDone={true} 
      />
    );

    expect(lastFrame()).toContain('Error: Failed to parse OpenAPI spec');
    expect(lastFrame()).toContain('Please try again with a valid OpenAPI spec file');
  });

  it('should show success message when status is success', () => {
    const { lastFrame } = render(
      <OpenapiResults 
        status="success" 
        error={null} 
        progress="" 
        processingDone={true} 
      />
    );

    expect(lastFrame()).toContain('OpenAPI spec successfully applied!');
    expect(lastFrame()).toContain('Resources, actions, roles, and URL mappings have been created');
  });

  it('should not show spinner when processing is done but still loading', () => {
    const { lastFrame } = render(
      <OpenapiResults 
        status="loading" 
        error={null} 
        progress="Finalizing..." 
        processingDone={true} 
      />
    );

    // Should show unexpected state message
    expect(lastFrame()).toContain('Unexpected state');
  });

  it('should show fallback message for unexpected states', () => {
    // @ts-ignore - Deliberately passing an invalid status
    const { lastFrame } = render(
      <OpenapiResults 
        status="unknown" 
        error={null} 
        progress="" 
        processingDone={true} 
      />
    );

    expect(lastFrame()).toContain('Unexpected state');
  });
});