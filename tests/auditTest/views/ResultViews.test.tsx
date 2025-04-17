import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import ErrorResultView from '../../../source/components/test/views/ErrorResultView.js';
import DifferenceResultView from '../../../source/components/test/views/DifferenceResultView.js';
import DifferencesView from '../../../source/components/test/views/DifferencesView.js';
import ResultsView from '../../../source/components/test/views/ResultsView.js';
import {
	ComparisonResult,
	DetailedAuditLog,
} from '../../../source/components/test/auditTypes.js';

// Test data setup
const baseAuditLog: DetailedAuditLog = {
	id: '1',
	timestamp: '2023-01-01T00:00:00Z',
	user_id: 'user1',
	user_key: 'user1',
	resource: 'doc1',
	resource_type: 'document',
	action: 'read',
	tenant: 'default',
	decision: true,
};

const errorResult: ComparisonResult = {
	auditLog: baseAuditLog,
	originalDecision: true,
	newDecision: false,
	matches: false,
	error: 'PDP connection failed',
};

const mismatchResult: ComparisonResult = {
	auditLog: baseAuditLog,
	originalDecision: true,
	newDecision: false,
	matches: false,
};

const matchResult: ComparisonResult = {
	auditLog: baseAuditLog,
	originalDecision: true,
	newDecision: true,
	matches: true,
};

describe('ErrorResultView', () => {
	it('should render audit log information and error message', () => {
		const { lastFrame } = render(<ErrorResultView result={errorResult} />);

		expect(lastFrame()).toContain('User: user1');
		expect(lastFrame()).toContain('Resource: doc1');
		expect(lastFrame()).toContain('type: document');
		expect(lastFrame()).toContain('Action: read');
		expect(lastFrame()).toContain('Tenant: default');
		expect(lastFrame()).toContain('Error: PDP connection failed');
	});
});

describe('DifferenceResultView', () => {
	it('should render audit log information and decision comparison', () => {
		const { lastFrame } = render(
			<DifferenceResultView result={mismatchResult} />,
		);

		expect(lastFrame()).toContain('User: user1');
		expect(lastFrame()).toContain('Resource: doc1');
		expect(lastFrame()).toContain('type: document');
		expect(lastFrame()).toContain('Action: read');
		expect(lastFrame()).toContain('Tenant: default');
		expect(lastFrame()).toContain('Original: ALLOW');
		expect(lastFrame()).toContain('New: DENY');
	});
});

describe('DifferencesView', () => {
	it('should render a list of differences', () => {
		const results: ComparisonResult[] = [errorResult, mismatchResult];
		const { lastFrame } = render(<DifferencesView results={results} />);

		expect(lastFrame()).toContain('Differences found:');
		expect(lastFrame()).toContain('User: user1');
		expect(lastFrame()).toContain('Error: PDP connection failed');
		expect(lastFrame()).toContain('Original: ALLOW');
		expect(lastFrame()).toContain('New: DENY');
	});

	it('should handle empty results', () => {
		const { lastFrame } = render(<DifferencesView results={[]} />);

		expect(lastFrame()).toContain('Differences found:');
		// Should not crash and should render something
		expect(lastFrame()).toBeTruthy();
	});
});

describe('ResultsView', () => {
	it('should display summary with matches and differences', () => {
		const results: ComparisonResult[] = [
			matchResult,
			mismatchResult,
			errorResult,
		];
		const { lastFrame } = render(
			<ResultsView results={results} pdpUrl="http://localhost:7766" />,
		);

		expect(lastFrame()).toContain('Compared 3 audit logs against PDP');
		expect(lastFrame()).toContain('http://localhost:7766');
		expect(lastFrame()).toContain('1 matches');
		expect(lastFrame()).toContain('2 differences');
		expect(lastFrame()).toContain('1 errors');
		expect(lastFrame()).toContain('Differences found:');
	});

	it('should show success message when all results match', () => {
		const results: ComparisonResult[] = [matchResult, matchResult];
		const { lastFrame } = render(
			<ResultsView results={results} pdpUrl="http://localhost:7766" />,
		);

		expect(lastFrame()).toContain('2 matches');
		expect(lastFrame()).toContain('0 differences');
		expect(lastFrame()).toContain('All decisions match!');
		expect(lastFrame()).not.toContain('Differences found:');
	});

	it('should handle empty results', () => {
		const { lastFrame } = render(
			<ResultsView results={[]} pdpUrl="http://localhost:7766" />,
		);

		expect(lastFrame()).toContain('Compared 0 audit logs');
		expect(lastFrame()).toContain('0 matches');
		expect(lastFrame()).toContain('0 differences');
	});
});
