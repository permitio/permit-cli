import React from 'react';
import { option } from 'pastel';
import zod from 'zod';
import { type infer as zInfer } from 'zod';
import { AuthProvider } from '../../components/AuthProvider.js';
import DeleteComponent from '../../components/env/DeleteComponent.js';

export const description = 'Delete a Permit environment';

export const options = zod.object({
  key: zod
    .string()
    .optional()
    .describe(
      option({
        description:
          'Optional: API Key to be used for the environment deletion (should be at least a project level key). If not set, CLI lets you select one',
        alias: 'k',
      }),
    ),
  projectId: zod
    .string()
    .optional()
    .describe(
      option({
        description:
          'Optional: Project ID containing the environment to delete. If not set, the CLI lets you select one',
        alias: 'p',
      }),
    ),
  environmentId: zod
    .string()
    .optional()
    .describe(
      option({
        description:
          'Optional: Environment ID to delete. If not set, the CLI will ask you to select one',
        alias: 'e',
      }),
    ),
  force: zod
    .boolean()
    .optional()
    .default(false)
    .describe(
      option({
        description:
          'Optional: Skip confirmation prompts and force deletion',
        alias: 'f',
      }),
    ),
});

type Props = {
  readonly options: zInfer<typeof options>;
};

export default function Delete({
  options: { key, projectId, environmentId, force },
}: Props) {
  return (
    <AuthProvider permit_key={key} scope={'project'}>
      <DeleteComponent
        projectId={projectId}
        environmentId={environmentId}
        force={force}
      />
    </AuthProvider>
  );
}