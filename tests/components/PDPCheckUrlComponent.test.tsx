import React from 'react';
import { render } from 'ink-testing-library';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PDPCheckUrlComponent from '../../source/components/pdp/PDPCheckUrlComponent.js';

// Create a mock function outside the mock definition
const getAllowedUrlCheckMock = vi.fn();

// Mock the hooks and utilities
vi.mock('../../source/hooks/useCheckPdpApi.js', () => ({
  useCheckPdpApi: () => ({
    getAllowedUrlCheck: getAllowedUrlCheckMock
  })
}));

vi.mock('../../source/utils/attributes.js', () => ({
  parseAttributes: (attr) => {
    // Simple attribute parser mock
    if (attr === 'role:admin') return { role: 'admin' };
    if (attr === 'department:sales') return { department: 'sales' };
    return {};
  },
}));

describe('PDPCheckUrlComponent', () => {
  beforeEach(() => {
    // Reset mock before each test
    getAllowedUrlCheckMock.mockReset();
  });

  it('renders loading state initially', () => {
    // Setup mock to not resolve immediately
    getAllowedUrlCheckMock.mockReturnValue(new Promise(() => {}));
    
    const { lastFrame } = render(
      <PDPCheckUrlComponent 
        options={{
          user: 'john@example.com',
          url: 'https://example.com/api',
          method: 'GET',
          tenant: 'default',
        }} 
      />
    );
    
    expect(lastFrame()).toContain('Checking URL permission');
  });

  it('displays allowed result when permission is granted', async () => {
    // Mock successful permission check
    getAllowedUrlCheckMock.mockResolvedValue({ 
      data: { allow: true },
      error: null 
    });
    
    const { lastFrame } = render(
      <PDPCheckUrlComponent 
        options={{
          user: 'john@example.com',
          url: 'https://example.com/api',
          method: 'GET',
          tenant: 'default',
        }} 
      />
    );
    
    // Wait for the component to update
    await vi.waitFor(() => {
      expect(lastFrame()).toContain('Allowed');
    });
    
    expect(lastFrame()).toContain('✓ Allowed');
    expect(lastFrame()).toContain('URL: https://example.com/api');
    expect(lastFrame()).toContain('User: john@example.com');
  });

  it('displays denied result when permission is not granted', async () => {
    // Mock denied permission check
    getAllowedUrlCheckMock.mockResolvedValue({ 
      data: { allow: false },
      error: null 
    });
    
    const { lastFrame } = render(
      <PDPCheckUrlComponent 
        options={{
          user: 'john@example.com',
          url: 'https://example.com/private',
          method: 'POST',
          tenant: 'acme-corp',
        }} 
      />
    );
    
    // Wait for the component to update
    await vi.waitFor(() => {
      expect(lastFrame()).toContain('Denied');
    });
    
    expect(lastFrame()).toContain('✗ Denied');
    expect(lastFrame()).toContain('URL: https://example.com/private');
    expect(lastFrame()).toContain('Tenant: acme-corp');
  });

  it('handles user attributes correctly', async () => {
    // Mock successful permission check
    getAllowedUrlCheckMock.mockResolvedValue({ 
      data: { allow: true },
      error: null 
    });
    
    render(
      <PDPCheckUrlComponent 
        options={{
          user: 'john@example.com',
          url: 'https://example.com/api',
          method: 'GET',
          tenant: 'default',
          userAttributes: ['role:admin', 'department:sales'],
        }} 
      />
    );
    
    // Wait for the component to process
    await vi.waitFor(() => {
      expect(getAllowedUrlCheckMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            key: 'john@example.com',
            attributes: expect.objectContaining({
              role: 'admin',
              department: 'sales',
            }),
          }),
        }),
        undefined
      );
    });
  });

  it('displays error message when API call fails', async () => {
    // Mock API error
    getAllowedUrlCheckMock.mockResolvedValue({ 
      data: null,
      error: 'Failed to connect to PDP' 
    });
    
    const { lastFrame } = render(
      <PDPCheckUrlComponent 
        options={{
          user: 'john@example.com',
          url: 'https://example.com/api',
          method: 'GET',
          tenant: 'default',
        }} 
      />
    );
    
    // Wait for the component to update
    await vi.waitFor(() => {
      expect(lastFrame()).toContain('Error');
    });
    
    expect(lastFrame()).toContain('Error checking URL permission');
    expect(lastFrame()).toContain('Failed to connect to PDP');
  });

  it('uses custom PDP URL when provided', async () => {
    // Mock successful permission check
    getAllowedUrlCheckMock.mockResolvedValue({ 
      data: { allow: true },
      error: null 
    });
    
    const customPdpUrl = 'http://localhost:7766';
    
    render(
      <PDPCheckUrlComponent 
        options={{
          user: 'john@example.com',
          url: 'https://example.com/api',
          method: 'GET',
          tenant: 'default',
          pdpurl: customPdpUrl,
        }} 
      />
    );
    
    // Verify the custom PDP URL was passed to the hook
    await vi.waitFor(() => {
      expect(getAllowedUrlCheckMock).toHaveBeenCalledWith(
        expect.any(Object),
        customPdpUrl
      );
    });
  });
});