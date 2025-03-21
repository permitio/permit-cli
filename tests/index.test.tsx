import React from 'react';
import { render } from 'ink-testing-library';
import { describe, vi, expect, it, beforeEach } from 'vitest';
import Index from '../source/commands/index';
import * as useAuthStatusModule from '../source/hooks/useAuthStatus';

vi.mock('../source/hooks/useAuthStatus', () => ({
  useAuthStatus: vi.fn(),
}));

const defaultAuthData = {
  organization: { id: '', name: '' },
  project: null,
  environment: null,
};

const renderFrame = () => render(<Index />).lastFrame()?.toString();

describe('Index command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders logged out view', () => {
    vi.spyOn(useAuthStatusModule, 'useAuthStatus').mockReturnValue({
      loading: false,
      loggedIn: false,
      authData: defaultAuthData,
      error: null,
    });
    const frame = renderFrame();
    expect(frame).toMatch(/Run this command with --help for more information/);
    expect(frame).toMatch(/permit login/);
  });

  it('renders loading state', () => {
    vi.spyOn(useAuthStatusModule, 'useAuthStatus').mockReturnValue({
      loading: true,
      loggedIn: false,
      authData: defaultAuthData,
      error: null,
    });
    expect(renderFrame()).toMatch(/Checking authentication status/);
  });

  it('renders logged in view', () => {
    vi.spyOn(useAuthStatusModule, 'useAuthStatus').mockReturnValue({
      loading: false,
      loggedIn: true,
      authData: {
        organization: { id: 'org-123', name: 'Test Org' },
        project: { id: 'proj-123', name: 'Test Project' },
        environment: { id: 'env-123', name: 'Test Environment' },
      },
      error: null,
    });
    const frame = renderFrame();
    expect(frame).toMatch(/Run this command with --help for more information/);
    expect(frame).toMatch(/Test Org/);
    expect(frame).toMatch(/Test Project/);
    expect(frame).toMatch(/Test Environment/);
  });

  it('renders error state', () => {
    vi.spyOn(useAuthStatusModule, 'useAuthStatus').mockReturnValue({
      loading: false,
      loggedIn: false,
      authData: defaultAuthData,
      error: 'Authentication failed',
    });
    expect(renderFrame()).toMatch(/Error: Authentication failed/);
  });
});
