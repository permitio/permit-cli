import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import Index from '../../source/commands/test/index.js';

describe('Test Index Command', () => {
  it('should render text with subcommands information', () => {
    const { lastFrame } = render(<Index />);
    
    // Check that the command output contains information about subcommands
    expect(lastFrame()).toContain('Use one of the test subcommands');
    expect(lastFrame()).toContain('run');
  });
});