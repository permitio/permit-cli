import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import type { TrinoOptions, PermitResource } from './types.js';
import { useTrinoProcessor } from '../../../hooks/trino/useTrinoProcessor.js';
import { mapTrinoSchemaToPermitResources } from '../../../utils/trinoUtils.js';

export default function TrinoComponent(
	props: TrinoOptions,
): React.ReactElement {
	const { processTrinoSchema, status, errorMessage } = useTrinoProcessor();
	const [createdResources, setCreatedResources] = useState<PermitResource[]>(
		[],
	);

	useEffect(() => {
		(async () => {
			const client = await import('../../../utils/trinoUtils.js');
			const { connectToTrino, fetchTrinoSchema } = client;
			const trinoClient = connectToTrino(props);
			const trinoSchema = await fetchTrinoSchema(trinoClient, {
				catalog: props.catalog,
				schema: props.schema,
			});
			const permitResources = mapTrinoSchemaToPermitResources(trinoSchema, {
				createColumnResources: props.createColumnResources,
			});
			setCreatedResources(permitResources);
			await processTrinoSchema(props);
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	if (status === 'processing') {
		return <Text>Processing Trino schema and syncing with Permit...</Text>;
	}
	if (status === 'error') {
		return <Text color="red">Error: {errorMessage}</Text>;
	}
	if (status === 'done') {
		// Group resources by type
		const grouped: Record<string, string[]> = {};
		for (const r of createdResources) {
			let type = '';
			if (r.key === 'trino_sys') {
				type = 'System';
			} else {
				const match = r.key.match(/^trino-([a-z_]+)/);
				if (match && match[1]) {
					type = match[1]
						.replace(/_/g, ' ')
						.replace(/\b\w/g, l => l.toUpperCase());
				} else {
					type = 'Other';
				}
			}
			if (!grouped[type]) {
				grouped[type] = [];
			}
			const arr = grouped[type]!;
			arr.push(r.name);
		}
		// Sort types in a preferred order
		const typeOrder = [
			'Catalog',
			'Schema',
			'Table',
			'View',
			'Materialized View',
			'Column',
			'Function',
			'Procedure',
			'System',
			'Other',
		];
		const sortedTypes = Object.keys(grouped).sort((a, b) => {
			const ia = typeOrder.indexOf(a);
			const ib = typeOrder.indexOf(b);
			if (ia === -1 && ib === -1) return a.localeCompare(b);
			if (ia === -1) return 1;
			if (ib === -1) return -1;
			return ia - ib;
		});
		return (
			<>
				<Text>Trino schema successfully synced with Permit!</Text>
				{sortedTypes.map(type => {
					const items = grouped[type] ?? [];
					return (
						<Text key={type}>
							{type + 's'} ({items.length})
							{items
								.sort((a, b) => a.localeCompare(b))
								.map(name => `\n  - ${name}`)
								.join('')}
						</Text>
					);
				})}
			</>
		);
	}
	return <Text>Ready to process Trino schema...</Text>;
}
