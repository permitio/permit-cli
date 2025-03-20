import React from 'react';
import { option } from 'pastel';
import zod from 'zod';
import { type infer as zInfer } from 'zod';
import { AuthProvider } from '../../components/AuthProvider.js';
import CreateComponent from '../../components/env/CreateComponent.js';

export const description = 'Create a new Permit environment';

export const options = zod.object({
  key: zod
    .string()
    .optional()
    .describe(
      option({
        description:
          'Optional: API Key to be used for the environment creation (should be at least a project level key). If not set, CLI lets you select one',
        alias: 'k',
      }),
    ),
  projectId: zod
    .string()
    .optional()
    .describe(
      option({
        description:
          'Optional: Project ID to create the environment in. If not set, the CLI lets you select one',
        alias: 'p',
      }),
    ),
  name: zod
    .string()
    .optional()
    .describe(
      option({
        description:
          'Optional: The environment name. If not set, the CLI will ask you for one',
        alias: 'n',
      }),
    ),
  envKey: zod
    .string()
    .optional()
    .describe(
      option({
        description:
          'Optional: The environment key. If not set, it will be derived from the name',
        alias: 'e',
      }),
    ),
  description: zod
    .string()
    .optional()
    .describe(
      option({
        description:
          'Optional: The environment description. If not set, the CLI will ask you for it',
        alias: 'd',
      }),
    ),
});

type Props = {
  readonly options: zInfer<typeof options>;
};

export default function Create({
  options: { key, projectId, name, envKey, description },
}: Props) {
  return (
    <AuthProvider permit_key={key} scope={'project'}>
      <CreateComponent
        projectId={projectId}
        name={name}
        envKey={envKey}
        description={description}
      />
    </AuthProvider>
  );
}