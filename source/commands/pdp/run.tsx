import React from 'react';
import { AuthProvider } from '../../components/AuthProvider.js';
import PDPRunComponent from '../../components/pdp/PDPRunComponent.js';
import { type infer as zInfer, number, object, boolean } from 'zod';
import { option } from 'pastel';

export const options = object({
  opa: number()
    .optional()
    .describe(option({ description: 'Expose OPA port from the PDP' })),
  printCommand: boolean()
    .optional()
    .default(false)
    .describe(option({
      description: 'Print the Docker command without executing it',
      alias: 'p'
    })),
});

type Props = {
  options: zInfer<typeof options>;
};

export default function Run({ options: { opa, printCommand } }: Props) {
  return (
    <AuthProvider>
      <PDPRunComponent opa={opa} printCommand={printCommand} />
    </AuthProvider>
  );
}