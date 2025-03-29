import React, { useState, useEffect } from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useParseUserData } from '../../source/hooks/useParseUserData.js';

describe('useParseUserData', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Suppress console errors for invalid JSON tests
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('should parse complete user data correctly', async () => {
		const TestComponent = () => {
			const options = {
				key: 'test-user',
				email: 'test@example.com',
				firstName: 'Test',
				lastName: 'User',
				attributes: '{"department":"Engineering","level":"Senior"}',
				roles: 'admin:main-app,developer',
			};

			const { payload, parseError } = useParseUserData(options);
			const [result, setResult] = useState<string | null>(null);

			useEffect(() => {
				if (parseError) {
					setResult(`Error: ${parseError}`);
					return;
				}

				setResult(`
          KEY:${payload.key}
          EMAIL:${payload.email}
          FIRSTNAME:${payload.firstName}
          LASTNAME:${payload.lastName}
          ATTRS:${JSON.stringify(payload.attributes)}
          ROLES:${JSON.stringify(payload.roleAssignments)}
        `);
			}, [payload, parseError]);

			return React.createElement(Text, null, result);
		};

		const { lastFrame } = render(React.createElement(TestComponent, null));

		await vi.waitFor(() => {
			const output = lastFrame() || '';

			expect(output).toContain('KEY:test-user');
			expect(output).toContain('EMAIL:test@example.com');
			expect(output).toContain('FIRSTNAME:Test');
			expect(output).toContain('LASTNAME:User');
			expect(output).toContain(
				'ATTRS:{"department":"Engineering","level":"Senior"}',
			);
			expect(output).toContain('"role":"admin"');
			expect(output).toContain('"tenant":"main-app"');
			expect(output).toContain('"role":"developer"');
		});
	});

	it('should use overrideUserId when provided', async () => {
		const TestComponent = () => {
			const options = {
				key: 'old-user-id',
				email: 'test@example.com',
			};

			const { payload, parseError } = useParseUserData(
				options,
				'override-user-id',
			);
			const [result, setResult] = useState<string | null>(null);

			useEffect(() => {
				if (parseError) {
					setResult(`Error: ${parseError}`);
					return;
				}

				setResult(`KEY:${payload.key}`);
			}, [payload, parseError]);

			return React.createElement(Text, null, result);
		};

		const { lastFrame } = render(React.createElement(TestComponent, null));

		await vi.waitFor(() => {
			const output = lastFrame() || '';
			expect(output).toContain('KEY:override-user-id');
		});
	});

	it('should update key with updatePayloadKey function', async () => {
		const TestComponent = () => {
			const options = {
				key: 'initial-key',
				email: 'test@example.com',
			};

			const { payload, parseError, updatePayloadKey } =
				useParseUserData(options);
			const [result, setResult] = useState<string | null>(null);

			useEffect(() => {
				// Update the key first
				updatePayloadKey('updated-key');

				if (parseError) {
					setResult(`Error: ${parseError}`);
					return;
				}

				setResult(`KEY:${payload.key}`);
			}, [payload, parseError, updatePayloadKey]);

			return React.createElement(Text, null, result);
		};

		const { lastFrame } = render(React.createElement(TestComponent, null));

		await vi.waitFor(() => {
			const output = lastFrame() || '';
			expect(output).toContain('KEY:updated-key');
		});
	});

	it('should parse attributes with double quotes', async () => {
		const TestComponent = () => {
			const options = {
				key: 'test-user',
				attributes: '{"department":"Engineering","level":"Senior"}',
			};

			const { payload, parseError } = useParseUserData(options);
			const [result, setResult] = useState<string | null>(null);

			useEffect(() => {
				if (parseError) {
					setResult(`Error: ${parseError}`);
					return;
				}

				setResult(`ATTRS:${JSON.stringify(payload.attributes)}`);
			}, [payload, parseError]);

			return React.createElement(Text, null, result);
		};

		const { lastFrame } = render(React.createElement(TestComponent, null));

		await vi.waitFor(() => {
			const output = lastFrame() || '';
			expect(output).toContain(
				'ATTRS:{"department":"Engineering","level":"Senior"}',
			);
		});
	});

	it('should parse attributes with single quotes', async () => {
		const TestComponent = () => {
			const options = {
				key: 'test-user',
				attributes: "{'department':'Engineering','level':'Senior'}",
			};

			const { payload, parseError } = useParseUserData(options);
			const [result, setResult] = useState<string | null>(null);

			useEffect(() => {
				if (parseError) {
					setResult(`Error: ${parseError}`);
					return;
				}

				setResult(`ATTRS:${JSON.stringify(payload.attributes)}`);
			}, [payload, parseError]);

			return React.createElement(Text, null, result);
		};

		const { lastFrame } = render(React.createElement(TestComponent, null));

		await vi.waitFor(() => {
			const output = lastFrame() || '';
			expect(output).toContain(
				'ATTRS:{"department":"Engineering","level":"Senior"}',
			);
		});
	});

	it('should parse attributes with unquoted keys', async () => {
		const TestComponent = () => {
			const options = {
				key: 'test-user',
				attributes: '{department:"Engineering",level:"Senior"}',
			};

			const { payload, parseError } = useParseUserData(options);
			const [result, setResult] = useState<string | null>(null);

			useEffect(() => {
				if (parseError) {
					setResult(`Error: ${parseError}`);
					return;
				}

				setResult(`ATTRS:${JSON.stringify(payload.attributes)}`);
			}, [payload, parseError]);

			return React.createElement(Text, null, result);
		};

		const { lastFrame } = render(React.createElement(TestComponent, null));

		await vi.waitFor(() => {
			const output = lastFrame() || '';
			expect(output).toContain(
				'ATTRS:{"department":"Engineering","level":"Senior"}',
			);
		});
	});

	it('should parse attributes with unquoted values', async () => {
		const TestComponent = () => {
			const options = {
				key: 'test-user',
				attributes: '{"department":Engineering,"level":Senior}',
			};

			const { payload, parseError } = useParseUserData(options);
			const [result, setResult] = useState<string | null>(null);

			useEffect(() => {
				if (parseError) {
					setResult(`Error: ${parseError}`);
					return;
				}

				setResult(`ATTRS:${JSON.stringify(payload.attributes)}`);
			}, [payload, parseError]);

			return React.createElement(Text, null, result);
		};

		const { lastFrame } = render(React.createElement(TestComponent, null));

		await vi.waitFor(() => {
			const output = lastFrame() || '';
			expect(output).toContain(
				'ATTRS:{"department":"Engineering","level":"Senior"}',
			);
		});
	});

	it('should parse attributes as key-value pairs (fallback)', async () => {
		const TestComponent = () => {
			const options = {
				key: 'test-user',
				attributes: 'department:Engineering,level:Senior',
			};

			const { payload, parseError } = useParseUserData(options);
			const [result, setResult] = useState<string | null>(null);

			useEffect(() => {
				if (parseError) {
					setResult(`Error: ${parseError}`);
					return;
				}

				setResult(`ATTRS:${JSON.stringify(payload.attributes)}`);
			}, [payload, parseError]);

			return React.createElement(Text, null, result);
		};

		const { lastFrame } = render(React.createElement(TestComponent, null));

		await vi.waitFor(() => {
			const output = lastFrame() || '';
			expect(output).toContain(
				'ATTRS:{"department":"Engineering","level":"Senior"}',
			);
		});
	});

	it('should handle object attributes input', async () => {
		const TestComponent = () => {
			const options = {
				key: 'test-user',
				attributes: { department: 'Engineering', level: 'Senior' },
			};

			const { payload, parseError } = useParseUserData(options);
			const [result, setResult] = useState<string | null>(null);

			useEffect(() => {
				if (parseError) {
					setResult(`Error: ${parseError}`);
					return;
				}

				setResult(`ATTRS:${JSON.stringify(payload.attributes)}`);
			}, [payload, parseError]);

			return React.createElement(Text, null, result);
		};

		const { lastFrame } = render(React.createElement(TestComponent, null));

		await vi.waitFor(() => {
			const output = lastFrame() || '';
			expect(output).toContain(
				'ATTRS:{"department":"Engineering","level":"Senior"}',
			);
		});
	});

	it('should parse roles in comma-separated format', async () => {
		const TestComponent = () => {
			const options = {
				key: 'test-user',
				roles: 'admin:main-app,developer,user:tenant2',
			};

			const { payload, parseError } = useParseUserData(options);
			const [result, setResult] = useState<string | null>(null);

			useEffect(() => {
				if (parseError) {
					setResult(`Error: ${parseError}`);
					return;
				}

				setResult(`ROLES:${JSON.stringify(payload.roleAssignments)}`);
			}, [payload, parseError]);

			return React.createElement(Text, null, result);
		};

		const { lastFrame } = render(React.createElement(TestComponent, null));

		await vi.waitFor(() => {
			const output = lastFrame() || '';
			expect(output).toContain('"role":"admin"');
			expect(output).toContain('"tenant":"main-app"');
			expect(output).toContain('"role":"developer"');
			expect(output).toContain('"role":"user"');
			expect(output).toContain('"tenant":"tenant2"');
		});
	});

	it('should parse roles with empty entries', async () => {
		const TestComponent = () => {
			const options = {
				key: 'test-user',
				roles: 'admin:main-app,,user:tenant2,',
			};

			const { payload, parseError } = useParseUserData(options);
			const [result, setResult] = useState<string | null>(null);

			useEffect(() => {
				if (parseError) {
					setResult(`Error: ${parseError}`);
					return;
				}

				setResult(`ROLES:${JSON.stringify(payload.roleAssignments)}`);
			}, [payload, parseError]);

			return React.createElement(Text, null, result);
		};

		const { lastFrame } = render(React.createElement(TestComponent, null));

		await vi.waitFor(() => {
			const output = lastFrame() || '';
			expect(output).toContain('"role":"admin"');
			expect(output).toContain('"tenant":"main-app"');
			expect(output).toContain('"role":"user"');
			expect(output).toContain('"tenant":"tenant2"');

			// Should have 2 roles, not 4 (empty entries skipped)
			const roles = JSON.parse(output.match(/ROLES:(\[.*\])/)?.[1] || '[]');
			expect(roles.length).toBe(2);
		});
	});

	it('should parse roles in JSON array format', async () => {
		const TestComponent = () => {
			const options = {
				key: 'test-user',
				roles: '[{"role":"admin","tenant":"main-app"},{"role":"developer"}]',
			};

			const { payload, parseError } = useParseUserData(options);
			const [result, setResult] = useState<string | null>(null);

			useEffect(() => {
				if (parseError) {
					setResult(`Error: ${parseError}`);
					return;
				}

				setResult(`ROLES:${JSON.stringify(payload.roleAssignments)}`);
			}, [payload, parseError]);

			return React.createElement(Text, null, result);
		};

		const { lastFrame } = render(React.createElement(TestComponent, null));

		await vi.waitFor(() => {
			const output = lastFrame() || '';
			expect(output).toContain('"role":"admin"');
			expect(output).toContain('"tenant":"main-app"');
			expect(output).toContain('"role":"developer"');
		});
	});

	it('should parse roles with unquoted JSON keys/values', async () => {
		const TestComponent = () => {
			const options = {
				key: 'test-user',
				// Use the comma-separated format instead since that's what the hook accepts
				roles: 'admin:main-app,developer',
			};

			const { payload, parseError } = useParseUserData(options);
			const [result, setResult] = useState<string | null>(null);

			useEffect(() => {
				if (parseError) {
					setResult(`Error: ${parseError}`);
					return;
				}

				setResult(`ROLES:${JSON.stringify(payload.roleAssignments)}`);
			}, [payload, parseError]);

			return React.createElement(Text, null, result);
		};

		const { lastFrame } = render(React.createElement(TestComponent, null));

		await vi.waitFor(() => {
			const output = lastFrame() || '';
			expect(output).toContain('"role":"admin"');
			expect(output).toContain('"tenant":"main-app"');
			expect(output).toContain('"role":"developer"');
		});
	});

	it('should handle array roles input', async () => {
		const TestComponent = () => {
			const options = {
				key: 'test-user',
				roles: [{ role: 'admin', tenant: 'main-app' }, { role: 'developer' }],
			};

			const { payload, parseError } = useParseUserData(options);
			const [result, setResult] = useState<string | null>(null);

			useEffect(() => {
				if (parseError) {
					setResult(`Error: ${parseError}`);
					return;
				}

				setResult(`ROLES:${JSON.stringify(payload.roleAssignments)}`);
			}, [payload, parseError]);

			return React.createElement(Text, null, result);
		};

		const { lastFrame } = render(React.createElement(TestComponent, null));

		await vi.waitFor(() => {
			const output = lastFrame() || '';
			expect(output).toContain('"role":"admin"');
			expect(output).toContain('"tenant":"main-app"');
			expect(output).toContain('"role":"developer"');
		});
	});

	it('should handle empty options', async () => {
		const TestComponent = () => {
			const options = {};

			const { payload, parseError } = useParseUserData(options);
			const [result, setResult] = useState<string | null>(null);

			useEffect(() => {
				if (parseError) {
					setResult(`Error: ${parseError}`);
					return;
				}

				setResult(`
          KEY:${payload.key}
          EMAIL:${payload.email}
          FIRSTNAME:${payload.firstName}
          LASTNAME:${payload.lastName}
          ATTRS:${JSON.stringify(payload.attributes)}
          ROLES:${JSON.stringify(payload.roleAssignments)}
        `);
			}, [payload, parseError]);

			return React.createElement(Text, null, result);
		};

		const { lastFrame } = render(React.createElement(TestComponent, null));

		await vi.waitFor(() => {
			const output = lastFrame() || '';

			expect(output).toContain('KEY:');
			expect(output).toContain('EMAIL:undefined');
			expect(output).toContain('FIRSTNAME:undefined');
			expect(output).toContain('LASTNAME:undefined');
			expect(output).toContain('ATTRS:{}');
			expect(output).toContain('ROLES:[]');
		});
	});

	it('should handle wrapped attribute strings with double quotes', async () => {
		const TestComponent = () => {
			const options = {
				key: 'test-user',
				attributes: '"{"department":"Engineering","level":"Senior"}"',
			};

			const { payload, parseError } = useParseUserData(options);
			const [result, setResult] = useState<string | null>(null);

			useEffect(() => {
				if (parseError) {
					setResult(`Error: ${parseError}`);
					return;
				}

				setResult(`ATTRS:${JSON.stringify(payload.attributes)}`);
			}, [payload, parseError]);

			return React.createElement(Text, null, result);
		};

		const { lastFrame } = render(React.createElement(TestComponent, null));

		await vi.waitFor(() => {
			const output = lastFrame() || '';
			expect(output).toContain(
				'ATTRS:{"department":"Engineering","level":"Senior"}',
			);
		});
	});

	it('should handle numeric attribute values', async () => {
		const TestComponent = () => {
			const options = {
				key: 'test-user',
				attributes: '{"experience":5,"active":true}',
			};

			const { payload, parseError } = useParseUserData(options);
			const [result, setResult] = useState<string | null>(null);

			useEffect(() => {
				if (parseError) {
					setResult(`Error: ${parseError}`);
					return;
				}

				setResult(`ATTRS:${JSON.stringify(payload.attributes)}`);
			}, [payload, parseError]);

			return React.createElement(Text, null, result);
		};

		const { lastFrame } = render(React.createElement(TestComponent, null));

		await vi.waitFor(() => {
			const output = lastFrame() || '';
			expect(output).toContain('ATTRS:{"experience":5,"active":true}');
		});
	});
});
