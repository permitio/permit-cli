import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import Index from '../../../source/commands/test/run/index.js';

describe('Test Run Index Command', () => {
  it('should render text with audit subcommand information', () => {
    const { lastFrame } = render(<Index />);
    
    // Check that the command output contains information about the audit subcommand
    expect(lastFrame()).toContain('Use one of the subcommands to run tests');
    expect(lastFrame()).toContain('audit');
  });
});