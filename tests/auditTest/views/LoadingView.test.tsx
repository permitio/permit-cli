import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import LoadingView from '../../../source/components/test/views/LoadingView.js';
import { ProcessPhase } from '../../../source/components/test/auditTypes.js';

describe('LoadingView', () => {
  it('should render fetching message', () => {
    const { lastFrame } = render(
      <LoadingView
        phase={'fetching' as ProcessPhase}
        progress={{ current: 0, total: 0 }}
      />
    );

    expect(lastFrame()).toContain('Fetching audit logs');
  });

  it('should render processing message with progress', () => {
    const { lastFrame } = render(
      <LoadingView
        phase={'processing' as ProcessPhase}
        progress={{ current: 5, total: 10 }}
      />
    );

    expect(lastFrame()).toContain('Processing audit logs (5/10)');
  });

  it('should render checking message with progress', () => {
    const { lastFrame } = render(
      <LoadingView
        phase={'checking' as ProcessPhase}
        progress={{ current: 8, total: 20 }}
      />
    );

    expect(lastFrame()).toContain('Checking against PDP (8/20)');
  });

  it('should handle complete phase gracefully', () => {
    const { lastFrame } = render(
      <LoadingView
        phase={'complete' as ProcessPhase}
        progress={{ current: 10, total: 10 }}
      />
    );

    // Should not crash and should render something
    expect(lastFrame()).toBeTruthy();
  });
});