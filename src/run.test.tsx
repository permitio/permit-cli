import React from 'react';
import { waitFor } from '@testing-library/react';
import PDPCommand from './components/PDPCommand.js';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import Run from './commands/pdp/run.js';
import { Text } from 'ink';

// Mock the PDPCommand component
// vi.mock('../components/PDPCommand.js', () => {
// 	return {
// 		__esModule: true,
// 		default: vi.fn(props => {
// 			console.log('PDPCommand rendered with props:', props); // Logging to check calls
// 			return <Text>PDP Command Mock</Text>;
// 		}),
// 	};
// });

describe('Run Component', () => {
	it('should render PDPCommand with the correct props', async () => {
		const opaValue = 8080;

        const pdpCommandSpy = vi.spyOn(PDPCommand, 'default').mockImplementation((props: PDPCommandProps) => {
            console.log('PDPCommand rendered with props:', props);
            return <Text>PDP Command Mock</Text>;
          });

		// Render the Run component
		render(<Run options={{ opa: opaValue }} />);

		// Wait for the mock component to be rendered
		await waitFor(() => {
			// Check if the PDPCommand was called with the correct props
			expect(PDPCommand).toHaveBeenCalled();
			expect(PDPCommand).toHaveBeenCalledWith(
				{ opa: opaValue }, // Ensure it was called with the correct props
				expect.anything(), // Match children or other props if needed
			);
		});

		// Optional: Ensure that the mock text appears in the last frame
		const { lastFrame } = render(<Run options={{ opa: opaValue }} />);
		expect(lastFrame()).toContain('PDP Command Mock');
	});
});

