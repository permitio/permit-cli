import React from 'react';
import { describe, it, expect } from 'vitest';
import * as auditCommand from '../../../source/commands/test/run/audit';

describe('Audit Command', () => {
  it('should have the correct description', () => {
    expect(auditCommand.description).toBe(
      'Test PDP against audit logs to find differences in behavior'
    );
  });

  it('should define appropriate options', () => {
    // Check option properties
    const options = auditCommand.options;
    expect(options).toBeDefined();
    
    // Check that certain keys exist in the options shape
    const shape = options.shape;
    expect(shape).toHaveProperty('apiKey');
    expect(shape).toHaveProperty('pdpUrl');
    expect(shape).toHaveProperty('timeFrame');
    expect(shape).toHaveProperty('sourcePdp');
    expect(shape).toHaveProperty('users');
    expect(shape).toHaveProperty('resources');
    expect(shape).toHaveProperty('tenant');
    expect(shape).toHaveProperty('action');
    expect(shape).toHaveProperty('decision');
  });

  it('should render component with the correct structure', () => {
    // Create component with test options
    const Audit = auditCommand.default;
    const testOptions = {
      apiKey: 'test-key',
      pdpUrl: 'http://test.pdp',
      timeFrame: 12
    };
    
    const element = Audit({ options: testOptions });
    
    // Instead of checking component types, check the structure and props
    // Check that the outer element (AuthProvider) has the right props
    expect(element.props).toHaveProperty('permit_key', 'test-key');
    expect(element.props).toHaveProperty('scope', 'environment');
    expect(element.props).toHaveProperty('children');
    
    // Check that the children element (TestRunAuditComponent) has the right props
    const childElement = element.props.children;
    expect(childElement.props).toHaveProperty('options');
    expect(childElement.props.options).toBe(testOptions);
  });

  it('should pass all options to TestRunAuditComponent', () => {
    // Test with full set of options
    const Audit = auditCommand.default;
    const fullOptions = {
      apiKey: 'test-key',
      pdpUrl: 'http://test.pdp',
      timeFrame: 12,
      sourcePdp: 'pdp1',
      users: 'user1,user2',
      resources: 'res1,res2',
      tenant: 'tenant1',
      action: 'read',
      decision: 'allow'
    };
    
    const element = Audit({ options: fullOptions });
    const childElement = element.props.children;
    
    // Verify all options are passed through
    expect(childElement.props.options).toEqual(fullOptions);
    
    // Specifically check a few key options
    expect(childElement.props.options.sourcePdp).toBe('pdp1');
    expect(childElement.props.options.decision).toBe('allow');
  });
});