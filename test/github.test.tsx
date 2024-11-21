import React from 'react';
import { render } from 'ink-testing-library';
import APIToken from '../source/components/gitops/APIToken.js';
import delay from 'delay';
import { spy } from 'sinon';
import test from 'ava';

const enter = '\r';

test('APIToken - Correct Value', async t => {
	const onApiKeySubmit = spy();
	const onError = spy();
	const { stdin, lastFrame } = render(
		<APIToken onApiKeySubmit={onApiKeySubmit} onError={onError} />,
	);
	let frameString:string;
	frameString = lastFrame()?.toString() ?? '';

	t.regex(frameString, /Enter Your API Key:/);
	const key = 'permit_key_'.concat('a'.repeat(97));
	await delay(100);
	stdin.write(key);
	await delay(100);
	stdin.write(enter);
	await delay(300);
	t.true(onApiKeySubmit.calledOnce);
	t.true(onApiKeySubmit.calledWith(key));
});

test ('APIToken - Incorrect Value', async t => {
	const onApiKeySubmit = spy();
	const onError = spy();
	const { stdin, lastFrame } = render(
		<APIToken onApiKeySubmit={onApiKeySubmit} onError={onError} />,
	);
	let frameString:string;
	frameString = lastFrame()?.toString() ?? '';

	t.regex(frameString, /Enter Your API Key:/);
	const key = 'InvalidKey';
	await delay(100);
	stdin.write(key);
	await delay(100);
	stdin.write(enter);
	await delay(300);
	t.true(onError.calledOnce);
	t.true(onError.calledWith('Invalid API Key'));
})

test ('APIToken - Empty Value', async t => {
	const onApiKeySubmit = spy();
	const onError = spy();
	const { stdin, lastFrame } = render(
		<APIToken onApiKeySubmit={onApiKeySubmit} onError={onError} />,
	);
	let frameString:string;
	frameString = lastFrame()?.toString() ?? '';

	t.regex(frameString, /Enter Your API Key:/);
	const key = '';
	await delay(100);
	stdin.write(key);
	await delay(100);
	stdin.write(enter);
	await delay(300);
	t.true(onError.calledOnce);
	t.true(onError.calledWith('API Key is required'));
})