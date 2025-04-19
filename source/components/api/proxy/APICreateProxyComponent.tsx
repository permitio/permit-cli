import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Text } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { type infer as zType } from 'zod';
import { useAuth } from '../../AuthProvider.js';
import { useCreateProxy } from '../../../hooks/useCreateProxy.js';
import { useParseProxyData } from '../../../hooks/useParseProxyData.js';
import { options as originalOptions } from '../../../commands/api/create/proxy.js';

type ExtendedOptions = zType<typeof originalOptions>;

type MappingRule = {
	url: string;
	url_type?: 'regex';
	http_method: 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch';
	resource: string;
	headers?: Record<string, string>;
	action?: string;
	priority?: number;
};

type Field =
	| 'key'
	| 'secret'
	| 'name'
	| 'mapping_start'
	| 'mapping_url'
	| 'mapping_url_type'
	| 'mapping_http_method'
	| 'mapping_resource'
	| 'mapping_headers'
	| 'mapping_headers_repeat'
	| 'mapping_action'
	| 'mapping_priority'
	| 'mapping_confirm'
	| 'mapping_repeat'
	| 'done';

export default function APICreateProxyComponent({
	options,
}: {
	options: ExtendedOptions;
}) {
	const { scope } = useAuth();
	const { payload, parseError } = useParseProxyData(options);
	const {
		status,
		errorMessage,
		createProxy,
		formatErrorMessage,
		setStatus,
		setErrorMessage,
	} = useCreateProxy();

	// Initial values
	const {
		key: initialKey = '',
		secret: initialSecret = '',
		name: initialName = '',
	} = options;

	const {
		mappingRuleMethod: initialMappingMethod,
		mappingRuleUrl: initialMappingUrl,
		mappingRuleResource: initialMappingResource,
	} = options;

	// Basic fields
	const [proxyKey, setProxyKey] = useState(initialKey);
	const [proxySecret, setProxySecret] = useState(initialSecret);
	const [proxyName, setProxyName] = useState(initialName);

	// Mapping rules state
	const [mappingRules, setMappingRules] = useState<MappingRule[]>(
		payload.mapping_rules || [],
	);
	const initialSingleRule: Partial<MappingRule> = {};
	if (initialMappingUrl) initialSingleRule.url = initialMappingUrl;
	if (initialMappingMethod)
		initialSingleRule.http_method =
			initialMappingMethod as MappingRule['http_method'];
	if (initialMappingResource)
		initialSingleRule.resource = initialMappingResource;
	/* …and headers/action/priority/url_type… */

	const hasMappingFlags = Boolean(
		initialMappingUrl || initialMappingMethod || initialMappingResource,
	);

	const [currentRule, setCurrentRule] =
		useState<Partial<MappingRule>>(initialSingleRule);
	const [headersInput, setHeadersInput] = useState('');

	// “y/n” inputs
	const [mappingStartInput, setMappingStartInput] = useState('');
	const [mappingConfirmInput, setMappingConfirmInput] = useState('');
	const [mappingRepeatInput, setMappingRepeatInput] = useState('');

	// Sequence control
	const [currentField, setCurrentField] = useState<Field>('key');

	//  Check that scope is present
	useEffect(() => {
		if (!scope.project_id || !scope.environment_id) {
			setErrorMessage(
				'Error: scope.project_id and scope.environment_id are required.',
			);
			setStatus('error');
		}
	}, [scope.project_id, scope.environment_id, setErrorMessage, setStatus]);

	//  Prepare to create when we reach “done”
	const triggerCreate = useCallback(() => {
		createProxy({
			key: proxyKey,
			secret: proxySecret,
			name: proxyName,
			auth_mechanism: payload.auth_mechanism || 'Bearer',
			mapping_rules: mappingRules,
		}).catch(err => {
			setErrorMessage(err instanceof Error ? err.message : String(err));
			setStatus('error');
		});
	}, [
		createProxy,
		proxyKey,
		proxySecret,
		proxyName,
		mappingRules,
		payload.auth_mechanism,
		setErrorMessage,
		setStatus,
	]);

	//  Handle any parse errors
	useEffect(() => {
		if (parseError) {
			setErrorMessage(parseError);
			setStatus('error');
		}
	}, [parseError, setErrorMessage, setStatus]);

	// On first mount, pick the right first field
	const hasMountedRef = useRef(false);
	useEffect(() => {
		if (hasMountedRef.current) return;
		hasMountedRef.current = true;
		setStatus('input');

		if (initialKey && initialSecret && initialName) {
			if (hasMappingFlags) {
				// jump to the first missing bit of that individual rule:
				if (!initialMappingUrl) setCurrentField('mapping_url');
				else if (!initialMappingMethod) setCurrentField('mapping_http_method');
				else if (!initialMappingResource) setCurrentField('mapping_resource');
				else setCurrentField('mapping_headers');
			} else {
				setCurrentField('mapping_start');
			}
		} else if (!initialKey) {
			setCurrentField('key');
		} else if (!initialSecret) {
			setCurrentField('secret');
		} else {
			setCurrentField('name');
		}
	}, [
		initialKey,
		initialSecret,
		initialName,
		hasMappingFlags,
		initialMappingUrl,
		initialMappingMethod,
		initialMappingResource,
		setStatus,
		setCurrentField,
	]);

	//  When field becomes “done”, fire off creation
	useEffect(() => {
		if (currentField === 'done') {
			triggerCreate();
		}
	}, [currentField, triggerCreate]);

	// Input handler
	const handleSubmit = useCallback(
		(value: string) => {
			const val = value.trim();
			switch (currentField) {
				case 'key':
					if (!val) return;
					setProxyKey(val);
					setCurrentField('secret');
					break;
				case 'secret':
					if (!val) return;
					setProxySecret(val);
					setCurrentField('name');
					break;
				case 'name':
					if (!val) return;
					setProxyName(val);
					setCurrentField('mapping_start');
					break;
				case 'mapping_start':
					if (val.toLowerCase() === 'n') {
						setCurrentField('done');
					} else {
						setCurrentField('mapping_url');
					}
					break;
				case 'mapping_url':
					if (!val) return;
					setCurrentRule(r => ({ ...r, url: val }));
					setCurrentField('mapping_url_type');
					break;
				case 'mapping_url_type':
					if (val === 'regex') {
						setCurrentRule(r => ({
							...r,
							url_type: 'regex',
						}));
					}
					setCurrentField('mapping_http_method');
					break;
				case 'mapping_http_method':
					if (!val) return;
					setCurrentRule(r => ({
						...r,
						http_method: val as MappingRule['http_method'],
					}));
					setCurrentField('mapping_resource');
					break;
				case 'mapping_resource':
					if (!val) return;
					setCurrentRule(r => ({ ...r, resource: val }));
					setCurrentField('mapping_headers');
					break;
				case 'mapping_headers':
					if (val) {
						try {
							const parsed: Record<string, string> = JSON.parse(val);
							if (typeof parsed === 'object' && !Array.isArray(parsed)) {
								setCurrentRule(r => ({
									...r,
									headers: { ...(r.headers || {}), ...parsed },
								}));
							}
						} catch {
							// ignore invalid JSON
						}
					}
					setHeadersInput('');
					setCurrentField('mapping_headers_repeat');
					break;

				case 'mapping_headers_repeat':
					if (val.toLowerCase() === 'n') {
						setCurrentField('mapping_action');
					} else {
						setCurrentField('mapping_headers');
					}
					break;
				case 'mapping_action':
					if (val) {
						setCurrentRule(r => ({ ...r, action: val }));
					}
					setCurrentField('mapping_priority');
					break;
				case 'mapping_priority':
					if (val && !isNaN(Number(val))) {
						setCurrentRule(r => ({
							...r,
							priority: Number(val),
						}));
					}
					setCurrentField('mapping_confirm');
					break;
				case 'mapping_confirm': {
					// make a one‑off copy
					const finishedRule = { ...(currentRule as MappingRule) };

					setMappingRules(rs => [...rs, finishedRule]);
					setCurrentRule({});
					setCurrentField('mapping_repeat');
					break;
				}

				case 'mapping_repeat':
					if (val.toLowerCase() === 'n') {
						setCurrentField('done');
					} else {
						setCurrentField('mapping_url');
					}
					break;
			}
		},
		[currentField, currentRule],
	);

	// Render phases
	if (status === 'input') {
		switch (currentField) {
			case 'key':
				return (
					<>
						<Text color="yellow">Proxy Key is required. Please enter it:</Text>
						<TextInput
							value={proxyKey}
							onChange={setProxyKey}
							onSubmit={handleSubmit}
						/>
					</>
				);
			case 'secret':
				return (
					<>
						<Text color="yellow">
							Proxy Secret is required. Please enter it:
						</Text>
						<TextInput
							value={proxySecret}
							onChange={setProxySecret}
							onSubmit={handleSubmit}
						/>
					</>
				);
			case 'name':
				return (
					<>
						<Text color="yellow">Proxy Name is required. Please enter it:</Text>
						<TextInput
							value={proxyName}
							onChange={setProxyName}
							onSubmit={handleSubmit}
						/>
					</>
				);
			case 'mapping_start':
				return (
					<>
						<Text color="yellow">
							Would you like to add mapping rules? (y/n):
						</Text>
						<TextInput
							value={mappingStartInput}
							onChange={setMappingStartInput}
							onSubmit={v => {
								handleSubmit(v);
								setMappingStartInput('');
							}}
						/>
					</>
				);
			case 'mapping_url':
				return (
					<>
						<Text color="yellow">Enter mapping rule URL (full URL):</Text>
						<TextInput
							value={currentRule.url || ''}
							onChange={url => setCurrentRule(r => ({ ...r, url }))}
							onSubmit={handleSubmit}
						/>
					</>
				);
			case 'mapping_url_type':
				return (
					<>
						<Text color="yellow">
							URL type? (type &apos;regex&apos; or press enter for default):
						</Text>
						<TextInput
							value={currentRule.url_type || ''}
							onChange={val =>
								setCurrentRule(r => ({
									...r,
									url_type: val as MappingRule['url_type'],
								}))
							}
							onSubmit={handleSubmit}
						/>
					</>
				);
			case 'mapping_http_method':
				return (
					<>
						<Text color="yellow">
							HTTP method (get, post, put, delete, options, head, patch):
						</Text>
						<TextInput
							value={currentRule.http_method || ''}
							onChange={val =>
								setCurrentRule(r => ({
									...r,
									http_method: val as MappingRule['http_method'],
								}))
							}
							onSubmit={handleSubmit}
						/>
					</>
				);
			case 'mapping_resource':
				return (
					<>
						<Text color="yellow">
							Resource name (alphanumeric, hyphens allowed):
						</Text>
						<TextInput
							value={currentRule.resource || ''}
							onChange={val =>
								setCurrentRule(r => ({
									...r,
									resource: val,
								}))
							}
							onSubmit={handleSubmit}
						/>
					</>
				);
			case 'mapping_headers':
				return (
					<>
						<Text color="yellow">
							Enter a header as JSON (e.g., {'{"Authorization":"Bearer token"}'}
							) or press enter to skip:
						</Text>
						<TextInput
							value={headersInput}
							onChange={setHeadersInput}
							onSubmit={handleSubmit}
						/>
					</>
				);
			case 'mapping_headers_repeat':
				return (
					<>
						<Text color="yellow">Add another header? (y/n):</Text>
						<TextInput
							value={headersInput}
							onChange={setHeadersInput}
							onSubmit={v => {
								handleSubmit(v);
								setHeadersInput('');
							}}
						/>
					</>
				);
			case 'mapping_action':
				return (
					<>
						<Text color="yellow">Action (optional):</Text>
						<TextInput
							value={currentRule.action || ''}
							onChange={val =>
								setCurrentRule(r => ({
									...r,
									action: val,
								}))
							}
							onSubmit={handleSubmit}
						/>
					</>
				);
			case 'mapping_priority':
				return (
					<>
						<Text color="yellow">Priority (number, optional):</Text>
						<TextInput
							value={currentRule.priority?.toString() || ''}
							onChange={val =>
								setCurrentRule(r => ({
									...r,
									priority: Number(val),
								}))
							}
							onSubmit={handleSubmit}
						/>
					</>
				);
			case 'mapping_confirm':
				return (
					<>
						<Text color="green">Mapping rule recorded.</Text>
						<Text color="yellow">Press enter to continue.</Text>
						<TextInput
							value={mappingConfirmInput}
							onChange={setMappingConfirmInput}
							onSubmit={v => {
								handleSubmit(v);
								setMappingConfirmInput('');
							}}
						/>
					</>
				);
			case 'mapping_repeat':
				return (
					<>
						<Text color="yellow">Add another mapping rule? (y/n):</Text>
						<TextInput
							value={mappingRepeatInput}
							onChange={setMappingRepeatInput}
							onSubmit={v => {
								handleSubmit(v);
								setMappingRepeatInput('');
							}}
						/>
					</>
				);
		}
	}

	if (status === 'processing') {
		return (
			<Text>
				<Spinner type="dots" /> Creating proxy config...
			</Text>
		);
	}

	if (status === 'error' && errorMessage) {
		return <Text color="red">Error: {formatErrorMessage(errorMessage)}</Text>;
	}

	if (status === 'done') {
		return <Text color="green">Proxy Config created successfully!</Text>;
	}

	return null;
}
