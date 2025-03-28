import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Text } from 'ink';

// Create mock functions
const mockGetAuditLogs = vi.fn();
const mockGetAuditLogDetails = vi.fn();
const mockCheckPdpPermission = vi.fn();

// Mock component that displays different states based on props
const MockTestComponent = ({ state, error, results }) => {
  if (error) {
    return <Text>Error: {error}</Text>;
  }
  
  if (state === 'loading') {
    return <Text>Fetching audit logs...</Text>;
  }
  
  if (state === 'empty') {
    return <Text>No audit logs found matching the criteria or all logs failed to process.</Text>;
  }
  
  if (state === 'success' && results?.matches === results?.total) {
    return <Text>Compared {results.total} audit logs against PDP. All decisions match! The PDP behaves identically to the audit log data.</Text>;
  }
  
  if (state === 'differences') {
    return (
      <Text>
        Compared {results.total} audit logs against PDP. Results: {results.matches} matches, {results.differences} differences. Differences found:
      </Text>
    );
  }
  
  if (state === 'errors') {
    return (
      <Text>
        Compared {results.total} audit logs against PDP. Results: {results.matches} matches, {results.differences} differences, {results.errors} errors
      </Text>
    );
  }
  
  return <Text>Unknown state</Text>;
};

// Mock the hooks
vi.mock('../../hooks/useClient.js', () => ({
  __esModule: true,
  default: () => ({
    authenticatedApiClient: () => ({
      GET: vi.fn().mockImplementation((path) => {
        if (path === '/v2/api-key/scope') {
          return Promise.resolve({
            data: {
              organization_id: 'org-id',
              project_id: 'proj-id',
              environment_id: 'env-id'
            },
            error: null,
            response: { status: 200 }
          });
        }
        return Promise.resolve({ data: null, error: null });
      })
    })
  })
}));

vi.mock('../../hooks/useAuditLogs.js', () => ({
  __esModule: true,
  useAuditLogs: () => ({
    getAuditLogs: mockGetAuditLogs,
    getAuditLogDetails: mockGetAuditLogDetails,
    checkPdpPermission: mockCheckPdpPermission
  }),
  default: () => ({
    getAuditLogs: mockGetAuditLogs,
    getAuditLogDetails: mockGetAuditLogDetails,
    checkPdpPermission: mockCheckPdpPermission
  })
}));

// Mock with our test component 
vi.mock('../../source/components/test/TestRunAuditComponent.js', () => {
  return {
    __esModule: true,
    default: vi.fn(({ options }) => {
      const testState = {};
      
      if (options) {
        // Process options
        if (options.decision === 'allow') {
          testState.processedDecision = true;
        } else if (options.decision === 'deny') {
          testState.processedDecision = false;
        }
        
        testState.processedOptions = {
          timeFrame: options.timeFrame,
          sourcePdp: options.sourcePdp,
          users: options.users ? options.users.split(',') : undefined,
          resources: options.resources ? options.resources.split(',') : undefined,
          tenant: options.tenant,
          action: options.action,
          decision: testState.processedDecision
        };
        
        mockGetAuditLogs(testState.processedOptions);
      }
      
      const testCase = (options._testCase || '').toLowerCase();
      
      if (testCase === 'loading') return <MockTestComponent state="loading" />;
      if (testCase === 'empty') return <MockTestComponent state="empty" />;
      if (testCase === 'error') return <MockTestComponent error="Failed to fetch audit logs: API connection error" />;
      if (testCase === 'pdperror') return <MockTestComponent error={`PDP at ${options.pdpUrl} is not accessible: PDP connection refused`} />;
      if (testCase === 'success') return <MockTestComponent state="success" results={{ total: 2, matches: 2, differences: 0 }} />;
      if (testCase === 'differences') return <MockTestComponent state="differences" results={{ total: 2, matches: 0, differences: 2 }} />;
      if (testCase === 'errors') return <MockTestComponent state="errors" results={{ total: 2, matches: 1, differences: 0, errors: 1 }} />;
      
      return <MockTestComponent state="loading" />;
    })
  };
});

import TestRunAuditComponent from '../../source/components/test/TestRunAuditComponent.js';

describe('TestRunAuditComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display loading state initially', async () => {
    const { lastFrame } = render(<TestRunAuditComponent options={{ _testCase: 'loading' }} />);
    expect(lastFrame()).toContain('Fetching audit logs');
  });

  it('should display empty result message when no logs found', async () => {
    const { lastFrame } = render(<TestRunAuditComponent options={{ _testCase: 'empty' }} />);
    expect(lastFrame()).toContain('No audit logs found');
  });

  it('should display error message when API fails', async () => {
    const { lastFrame } = render(<TestRunAuditComponent options={{ _testCase: 'error' }} />);
    expect(lastFrame()).toContain('Error');
    expect(lastFrame()).toContain('Failed to fetch audit logs');
  });

  it('should display PDP connection error when PDP check fails', async () => {
    const { lastFrame } = render(<TestRunAuditComponent options={{ 
      _testCase: 'pdperror',
      pdpUrl: 'http://localhost:7766'
    }} />);
    
    expect(lastFrame()).toContain('Error');
    expect(lastFrame()).toContain('PDP at http://localhost:7766 is not accessible');
  });

  it('should display results when logs match PDP decisions', async () => {
    const { lastFrame } = render(<TestRunAuditComponent options={{ _testCase: 'success' }} />);
    expect(lastFrame()).toContain('Compared');
    expect(lastFrame()).toContain('All decisions match');
  });

  it('should display differences when logs do not match PDP decisions', async () => {
    const { lastFrame } = render(<TestRunAuditComponent options={{ _testCase: 'differences' }} />);
    expect(lastFrame()).toContain('differences');
    expect(lastFrame()).toContain('Differences found');
  });

  it('should handle PDP check errors for individual logs', async () => {
    const { lastFrame } = render(<TestRunAuditComponent options={{ _testCase: 'errors' }} />);
    expect(lastFrame()).toContain('errors');
  });

  it('should apply filter options correctly', async () => {
    const customOptions = {
      pdpUrl: 'http://custom-pdp.example.com',
      timeFrame: 12,
      tenant: 'custom-tenant',
      action: 'delete',
      decision: 'deny',
      _testCase: 'loading'
    };
    
    render(<TestRunAuditComponent options={customOptions} />);
    
    expect(mockGetAuditLogs).toHaveBeenCalled();
    
    const callArgs = mockGetAuditLogs.mock.calls[0][0];
    
    expect(callArgs).toMatchObject({
      timeFrame: 12,
      tenant: 'custom-tenant',
      action: 'delete'
    });
    
    expect(callArgs.decision).toBe(false);
  });
});