export const generateVitestSample = (
	pdp_path?: string,
	config_path?: string,
	api_key?: string,
) => {
	return `import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { Permit } from 'permitio';

const JSON_PATH = ${config_path ? `"${config_path}"` : '"<YOUR_JSON_PATH_HERE>"'};
const PDP_URL = ${pdp_path ? `"${pdp_path}"` : '"<YOUR_PDP_URL_HERE>"'}; // If using Permit's PD : https://cloudpdp.api.permit.io
const PERMIT_ENV_TOKEN = ${api_key ? `"${api_key}"` : '"<YOUR_PERMIT_ENV_TOKEN_HERE>"'};

const permit = new Permit({
  pdp: PDP_URL,
  token: PERMIT_ENV_TOKEN,
});

// Load expected snapshot
const testCases = JSON.parse(readFileSync(JSON_PATH, 'utf-8')).config;

describe('Permit access checks', () => {
  for (const { user, action, resource, result } of testCases) {
    it(\`should return \${result} for \${JSON.stringify(user)} to \${action} on \${JSON.stringify(resource)}\`, async () => {
      const actual = await permit.check(user, action, resource);
      expect(actual).toBe(result);
    });
  }
});`;
};

export const generateJestSample = (
	pdp_path?: string,
	config_path?: string,
	api_key?: string,
) => {
	return `import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import { Permit } from 'permitio';

const JSON_PATH = ${config_path ? `"${config_path}"` : '"<YOUR_JSON_PATH_HERE>"'};
const PDP_URL = ${pdp_path ? `"${pdp_path}"` : '"<YOUR_PDP_URL_HERE>"'}; // If using Permit's PD : https://cloudpdp.api.permit.io
const PERMIT_ENV_TOKEN = ${api_key ? `"${api_key}"` : '"<YOUR_PERMIT_ENV_TOKEN_HERE>"'};

const permit = new Permit({
  pdp: PDP_URL,
  token: PERMIT_ENV_TOKEN,
});

// Load expected snapshot
const testCases = JSON.parse(readFileSync(JSON_PATH, 'utf-8')).config;

describe('Permit access checks', () => {
  for (const { user, action, resource, result } of testCases) {
    it(\`should return \${result} for \${JSON.stringify(user)} to \${action} on \${JSON.stringify(resource)}\`, async () => {
      const actual = await permit.check(user, action, resource);
      expect(actual).toBe(result);
    });
  }
});`;
};

export const generatePytestSample = (
	pdp_path?: string,
	config_path?: string,
	api_key?: string,
) => {
	return `import json
import pytest
import asyncio
import pytest_asyncio
from permit import Permit

JSON_PATH = ${config_path ? `"${config_path}"` : "'<YOUR_JSON_PATH_HERE>'"}
PDP_URL = ${pdp_path ? `"${pdp_path}"` : "'<YOUR_PDP_URL_HERE>'"}  # If using Permit's PD : https://cloudpdp.api.permit.io
PERMIT_ENV_TOKEN = ${api_key ? `"${api_key}"` : "'<YOUR_PERMIT_ENV_TOKEN_HERE>'"}

permit = Permit(
    pdp=PDP_URL,
    token=PERMIT_ENV_TOKEN,
)

# Load expected snapshot
with open(JSON_PATH, 'r') as f:
    test_cases = json.load(f)['config']

@pytest.mark.asyncio
@pytest.mark.parametrize("user, action, resource, expected", [
    (tc['user'], tc['action'], tc['resource'], tc['result']) for tc in test_cases
])
async def test_permit_access(user, action, resource, expected):
    actual = await permit.check(user, action, resource)
    assert actual == expected
`;
};
