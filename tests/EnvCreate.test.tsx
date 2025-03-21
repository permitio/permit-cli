import React from 'react';
import { render } from 'ink-testing-library';
import { describe, vi, expect, it, beforeEach } from 'vitest';
import Create from '../source/commands/env/create';
import * as AuthProvider from '../source/components/AuthProvider';
import * as CreateComponent from '../source/components/env/CreateComponent';

// Mock the components
vi.mock('../source/components/AuthProvider', () => ({
  AuthProvider: vi.fn(({ children }) => children),
}));

vi.mock('../source/components/env/CreateComponent', () => ({
  default: vi.fn(() => <div>Mocked CreateComponent</div>),
}));

describe('env create command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default options', () => {
    const options = {
      key: undefined,
      projectId: undefined,
      name: undefined,
      envKey: undefined,
      description: undefined,
    };

    render(<Create options={options} />);

    // Check AuthProvider was called with correct props
    expect(AuthProvider.AuthProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        permit_key: undefined, 
        scope: 'project',
      }),
      expect.anything()
    );

    // Check CreateComponent was called with correct props
    expect(CreateComponent.default).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: undefined,
        name: undefined,
        envKey: undefined,
        description: undefined,
      }),
      expect.anything()
    );
  });

  it('passes options correctly to CreateComponent', () => {
    const options = {
      key: 'test-key',
      projectId: 'project123',
      name: 'Test Environment',
      envKey: 'test_env',
      description: 'Test description',
    };

    render(<Create options={options} />);

    // Check AuthProvider was called with correct props
    expect(AuthProvider.AuthProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        permit_key: 'test-key', 
        scope: 'project',
      }),
      expect.anything()
    );

    // Check CreateComponent was called with correct props
    expect(CreateComponent.default).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project123',
        name: 'Test Environment',
        envKey: 'test_env',
        description: 'Test description',
      }),
      expect.anything()
    );
  });
});