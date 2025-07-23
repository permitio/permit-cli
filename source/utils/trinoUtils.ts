/**
 * Utility functions for connecting to Trino and extracting schema information.
 * All functions are lint/prettier compliant and ready for implementation.
 */

import type { PermitResource } from '../components/env/trino/types.js';

export interface TrinoColumn {
	name: string;
	type: string;
	nullable: boolean;
}

export interface TrinoTable {
	catalog: string;
	schema: string;
	name: string;
	type: string;
	columns: TrinoColumn[];
}

export interface TrinoSchema {
	catalog: string;
	name: string;
}

export interface TrinoCatalog {
	name: string;
}

export interface TrinoFunction {
	catalog: string;
	schema: string;
	name: string;
	returnType: string;
	argumentTypes: string[];
}

export interface TrinoView {
	catalog: string;
	schema: string;
	name: string;
	columns: TrinoColumn[];
}

export interface TrinoMaterializedView {
	catalog: string;
	schema: string;
	name: string;
	columns: TrinoColumn[];
}

export interface TrinoProcedure {
	catalog: string;
	schema: string;
	name: string;
	argumentTypes: string[];
}

export interface TrinoSchemaData {
	catalogs: TrinoCatalog[];
	schemas: TrinoSchema[];
	tables: TrinoTable[];
	functions: TrinoFunction[];
	views: TrinoView[];
	materializedViews: TrinoMaterializedView[];
	procedures: TrinoProcedure[];
}

/**
 * Map Trino column type to Permit attribute type.
 */
export function trinoTypeToPermitType(
	trinoType: string,
):
	| 'string'
	| 'number'
	| 'object'
	| 'json'
	| 'time'
	| 'bool'
	| 'array'
	| 'object_array' {
	const t = trinoType.toLowerCase();
	if (t.includes('char') || t === 'uuid' || t === 'varchar') return 'string';
	if (t === 'boolean') return 'bool';
	if (
		t === 'integer' ||
		t === 'int' ||
		t === 'bigint' ||
		t === 'smallint' ||
		t === 'tinyint' ||
		t === 'double' ||
		t === 'real' ||
		t === 'float' ||
		t === 'decimal'
	)
		return 'number';
	if (t === 'json') return 'json';
	if (t === 'array') return 'array';
	if (t === 'object' || t === 'row') return 'object';
	if (t === 'timestamp' || t === 'date' || t === 'time') return 'time';
	return 'string';
}

/**
 * Map Trino schema data to Permit resources.
 * - Each catalog, schema, table, and column is a resource.
 * - Each table resource includes columns as attributes (with type/description).
 */
export function mapTrinoSchemaToPermitResources(
	trino: TrinoSchemaData,
): PermitResource[] {
	const resources: PermitResource[] = [];
	const SEP = '-';

	// Catalogs
	for (const catalog of trino.catalogs) {
		resources.push({
			key: `trino${SEP}catalog${SEP}${catalog.name}`,
			name: catalog.name,
			description: `Trino resource type: catalog. Trino catalog: ${catalog.name}`,
			actions: [
				'AccessCatalog',
				'CreateCatalog',
				'DropCatalog',
				'FilterCatalogs',
			],
		});
	}

	// Schemas
	for (const schema of trino.schemas) {
		resources.push({
			key: `trino${SEP}schema${SEP}${schema.catalog}${SEP}${schema.name}`,
			name: `${schema.catalog}.${schema.name}`,
			description: `Trino resource type: schema. Schema ${schema.name} in catalog ${schema.catalog}`,
			actions: [
				'CreateSchema',
				'DropSchema',
				'RenameSchema',
				'SetSchemaAuthorization',
				'ShowSchemas',
				'FilterSchemas',
				'ShowCreateSchema',
			],
		});
	}

	const TABLE_AND_COLUMN_ACTIONS = [
		'ShowCreateTable',
		'CreateTable',
		'DropTable',
		'RenameTable',
		'SetTableProperties',
		'SetTableComment',
		'AddColumn',
		'AlterColumn',
		'DropColumn',
		'RenameColumn',
		'SelectFromColumns',
		'InsertIntoTable',
		'DeleteFromTable',
		'TruncateTable',
		'UpdateTableColumns',
		'ShowTables',
		'FilterTables',
		'ShowColumns',
		'FilterColumns',
		'SetTableAuthorization',
	];

	// Tables and columns
	for (const table of trino.tables) {
		const tableKey = `trino${SEP}table${SEP}${table.catalog}${SEP}${table.schema}${SEP}${table.name}`;
		resources.push({
			key: tableKey,
			name: `${table.catalog}.${table.schema}.${table.name}`,
			description: `Trino resource type: ${table.type.toLowerCase()}. ${table.type} ${table.name} in ${table.catalog}.${table.schema}`,
			actions: TABLE_AND_COLUMN_ACTIONS,
			attributes: table.columns.reduce(
				(acc, col) => {
					acc[col.name] = {
						type: trinoTypeToPermitType(col.type),
						description: col.nullable ? 'nullable' : undefined,
					};
					return acc;
				},
				{} as {
					[key: string]: {
						type:
							| 'string'
							| 'number'
							| 'object'
							| 'json'
							| 'time'
							| 'bool'
							| 'array'
							| 'object_array';
						description?: string;
					};
				},
			),
		});
		// Columns as resources
		for (const column of table.columns) {
			resources.push({
				key: `trino${SEP}column${SEP}${table.catalog}${SEP}${table.schema}${SEP}${table.name}${SEP}${column.name}`,
				name: `${table.catalog}.${table.schema}.${table.name}.${column.name}`,
				description: `Trino resource type: column. Column ${column.name} in ${table.catalog}.${table.schema}.${table.name}`,
				actions: TABLE_AND_COLUMN_ACTIONS,
				attributes: {
					parent_table: {
						type: 'string',
						description: `${table.catalog}.${table.schema}.${table.name}`,
					},
					table_type: { type: 'string', description: table.type.toLowerCase() },
					type: {
						type: trinoTypeToPermitType(column.type),
						description: column.type,
					},
					nullable: {
						type: 'bool',
						description: column.nullable ? 'nullable' : undefined,
					},
				},
			});
		}
	}

	// Views
	for (const view of trino.views) {
		resources.push({
			key: `trino${SEP}view${SEP}${view.catalog}${SEP}${view.schema}${SEP}${view.name}`,
			name: `${view.catalog}.${view.schema}.${view.name}`,
			description: `Trino resource type: view. View ${view.name} in ${view.catalog}.${view.schema}`,
			actions: [
				'CreateView',
				'RenameView',
				'DropView',
				'SetViewAuthorization',
				'SetViewComment',
				'CreateViewWithSelectFromColumns',
			],
			attributes: view.columns.reduce(
				(acc, col) => {
					acc[col.name] = {
						type: trinoTypeToPermitType(col.type),
						description: col.nullable ? 'nullable' : undefined,
					};
					return acc;
				},
				{} as {
					[key: string]: {
						type:
							| 'string'
							| 'number'
							| 'object'
							| 'json'
							| 'time'
							| 'bool'
							| 'array'
							| 'object_array';
						description?: string;
					};
				},
			),
		});
	}

	// Materialized Views
	for (const mview of trino.materializedViews) {
		resources.push({
			key: `trino${SEP}materialized_view${SEP}${mview.catalog}${SEP}${mview.schema}${SEP}${mview.name}`,
			name: `${mview.catalog}.${mview.schema}.${mview.name}`,
			description: `Trino resource type: materialized view. Materialized view ${mview.name} in ${mview.catalog}.${mview.schema}`,
			actions: [
				'CreateMaterializedView',
				'RefreshMaterializedView',
				'SetMaterializedViewProperties',
				'DropMaterializedView',
				'RenameMaterializedView',
			],
			attributes: mview.columns.reduce(
				(acc, col) => {
					acc[col.name] = {
						type: trinoTypeToPermitType(col.type),
						description: col.nullable ? 'nullable' : undefined,
					};
					return acc;
				},
				{} as {
					[key: string]: {
						type:
							| 'string'
							| 'number'
							| 'object'
							| 'json'
							| 'time'
							| 'bool'
							| 'array'
							| 'object_array';
						description?: string;
					};
				},
			),
		});
	}

	// Functions
	for (const fn of trino.functions) {
		resources.push({
			key: `trino${SEP}function${SEP}${fn.catalog}${SEP}${fn.schema}${SEP}${fn.name}`,
			name: `${fn.catalog}.${fn.schema}.${fn.name}`,
			description: `Trino resource type: function. Function ${fn.name} in ${fn.catalog}.${fn.schema}`,
			actions: [
				'ShowFunctions',
				'FilterFunctions',
				'ExecuteFunction',
				'CreateFunction',
				'DropFunction',
				'ShowCreateFunction',
				'CreateViewWithExecuteFunction',
			],
			attributes: {
				returnType: { type: trinoTypeToPermitType(fn.returnType) },
				argumentTypes: { type: 'array' },
			},
		});
	}

	// Procedures
	for (const proc of trino.procedures) {
		resources.push({
			key: `trino${SEP}procedure${SEP}${proc.catalog}${SEP}${proc.schema}${SEP}${proc.name}`,
			name: `${proc.catalog}.${proc.schema}.${proc.name}`,
			description: `Trino resource type: procedure. Procedure ${proc.name} in ${proc.catalog}.${proc.schema}`,
			actions: ['ExecuteProcedure', 'ExecuteTableProcedure'],
			attributes: {
				argumentTypes: { type: 'array' },
			},
		});
	}

	// Add Trino System resource
	resources.push({
		key: 'trino_sys',
		name: 'Trino System',
		description: 'Trino system-level resource for system-wide actions.',
		actions: [
			'ImpersonateUser',
			'ExecuteQuery',
			'ViewQueryOwnedBy',
			'FilterViewQueryOwnedBy',
			'KillQueryOwnedBy',
			'ReadSystemInformation',
			'WriteSystemInformation',
			'SetSystemSessionProperty',
			'GetRowFilters',
			'GetColumnMask',
		],
	});

	return resources;
}

// Connect to a Trino cluster (returns a client config)
export function connectToTrino(options: {
	url: string;
	user: string;
	password?: string;
}): { baseUrl: string; headers: Record<string, string> } {
	const headers: Record<string, string> = {
		'X-Trino-User': options.user,
		'X-Trino-Source': 'permit-cli',
	};
	if (options.password) {
		// Use btoa for base64 encoding
		headers['Authorization'] =
			'Basic ' + btoa(`${options.user}:${options.password}`);
	}
	return {
		baseUrl: options.url.replace(/\/$/, ''),
		headers,
	};
}

// Helper to execute a Trino query and return all rows
async function executeTrinoQuery(
	client: { baseUrl: string; headers: Record<string, string> },
	query: string,
): Promise<string[][]> {
	const res = await fetch(`${client.baseUrl}/v1/statement`, {
		method: 'POST',
		headers: {
			...client.headers,
			'Content-Type': 'text/plain',
		},
		body: query,
	});
	if (!res.ok)
		throw new Error(`Trino query failed: ${res.status} ${res.statusText}`);
	let data = await res.json();
	let rows: string[][] = data.data || [];
	let nextUri = data.nextUri;
	while (nextUri) {
		const nextRes = await fetch(nextUri, { headers: client.headers });
		const nextData = await nextRes.json();
		if (nextData.data) rows = rows.concat(nextData.data);
		nextUri = nextData.nextUri;
	}
	return rows;
}

// Helper: Use Trino passthrough table function to fetch functions/procedures
export async function fetchTrinoFunctionsAndProceduresPassthrough(
	client: { baseUrl: string; headers: Record<string, string> },
	catalog: string,
	schema: string,
): Promise<{
	functions: TrinoFunction[];
	procedures: TrinoProcedure[];
}> {
	const functions: TrinoFunction[] = [];
	const procedures: TrinoProcedure[] = [];

	if (catalog.toLowerCase() === 'postgresql') {
		const passthrough = `SELECT * FROM TABLE(postgresql.system.query(query => '
		SELECT p.proname as function_name, n.nspname as schema_name, 
		pg_catalog.pg_get_function_result(p.oid) as return_type, 
		pg_catalog.pg_get_function_arguments(p.oid) as arguments, 
		CASE p.prokind 
			WHEN ''f'' THEN ''FUNCTION'' 
			WHEN ''p'' THEN ''PROCEDURE'' 
			WHEN ''a'' THEN ''AGGREGATE'' 
			WHEN ''w'' THEN ''WINDOW'' 
			ELSE p.prokind::text 
		END as kind 
		FROM pg_catalog.pg_proc p 
		LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace 
		WHERE n.nspname = ''${schema}'' 
		AND p.proname NOT LIKE ''pg_%'' 
		ORDER BY p.proname
		'))`;
		try {
			const rows = await executeTrinoQuery(client, passthrough);
			for (const row of rows) {
				const [name, schemaName, returnType, args, kind] = row;
				if (kind === 'FUNCTION') {
					functions.push({
						catalog: catalog || '',
						schema: schemaName || '',
						name: name || '',
						returnType: returnType || 'unknown',
						argumentTypes: args
							? args.split(',').map((a: string) => a.trim())
							: [],
					});
				} else if (kind === 'PROCEDURE') {
					procedures.push({
						catalog: catalog || '',
						schema: schemaName || '',
						name: name || '',
						argumentTypes: args
							? args.split(',').map((a: string) => a.trim())
							: [],
					});
				}
			}
		} catch (e) {
			// console.log('[DEBUG] Passthrough for PostgreSQL failed:', e);
		}
	} else if (catalog.toLowerCase() === 'mysql') {
		const passthrough = `SELECT * FROM TABLE(mysql.system.query(query => '
		SELECT routine_name, routine_type, data_type, routine_definition 
		FROM information_schema.routines 
		WHERE routine_schema = ''${schema}''
		'))`;
		try {
			const rows = await executeTrinoQuery(client, passthrough);
			for (const row of rows) {
				const [name, routineType, returnType, _def] = row;
				if (
					routineType &&
					routineType.trim().toUpperCase().startsWith('FUNCTION')
				) {
					functions.push({
						catalog: catalog || '',
						schema: schema || '',
						name: name || '',
						returnType: returnType || 'unknown',
						argumentTypes: [],
					});
				} else if (
					routineType &&
					routineType.trim().toUpperCase().startsWith('PROCEDURE')
				) {
					procedures.push({
						catalog: catalog || '',
						schema: schema || '',
						name: name || '',
						argumentTypes: [],
					});
				}
			}
		} catch (e) {
			// console.log('[DEBUG] Passthrough for MySQL failed:', e);
		}
	}
	return { functions, procedures };
}

// Fetch catalogs, schemas, tables, and columns from Trino
export async function fetchTrinoSchema(
	client: { baseUrl: string; headers: Record<string, string> },
	options: { catalog?: string; schema?: string },
): Promise<TrinoSchemaData> {
	// 1. Catalogs
	const catalogQuery = options.catalog
		? `SHOW CATALOGS LIKE '${options.catalog}'`
		: 'SHOW CATALOGS';
	const catalogRows = await executeTrinoQuery(client, catalogQuery);
	let catalogs: TrinoCatalog[] = catalogRows
		.map(row => ({ name: row[0] ?? '' }))
		.filter(c => c.name);
	// Always exclude system/admin/internal catalogs
	const adminCatalogs = new Set(['system', 'information_schema']);
	catalogs = catalogs.filter(c => !adminCatalogs.has(c.name.toLowerCase()));

	// 2. Schemas
	let schemas: TrinoSchema[] = [];
	for (const catalog of catalogs) {
		const schemaQuery = options.schema
			? `SHOW SCHEMAS FROM ${catalog.name} LIKE '${options.schema}'`
			: `SHOW SCHEMAS FROM ${catalog.name}`;
		const schemaRows = await executeTrinoQuery(client, schemaQuery);
		let theseSchemas = schemaRows
			.map(row => ({ catalog: catalog.name, name: row[0] ?? '' }))
			.filter(s => s.name);
		// Always exclude system/admin/internal schemas
		const adminSchemas = new Set([
			'information_schema',
			'sys',
			'performance_schema',
			'mysql',
			'pg_catalog',
			'system',
		]);
		theseSchemas = theseSchemas.filter(
			s => !adminSchemas.has(s.name.toLowerCase()),
		);
		schemas.push(...theseSchemas);
	}

	// 3. Get table comments to help identify object types
	const tableComments = new Map<string, string>();
	try {
		const commentsQuery = `
			SELECT catalog_name, schema_name, table_name, comment 
			FROM system.metadata.table_comments 
			WHERE comment IS NOT NULL
		`;
		const commentRows = await executeTrinoQuery(client, commentsQuery);
		for (const row of commentRows) {
			const [catalog, schema, table, comment] = row;
			if (catalog && schema && table && comment) {
				const key = `${catalog}.${schema}.${table}`;
				tableComments.set(key, comment);
			}
		}
	} catch (_) {
		// console.log('[DEBUG] Could not fetch table comments');
	}

	// 4. Tables, Views, and Materialized Views
	const tables: TrinoTable[] = [];
	const views: TrinoView[] = [];
	const materializedViews: TrinoMaterializedView[] = [];

	for (const schema of schemas) {
		// Get all objects from information_schema
		const tableQuery = `SELECT table_name, table_type FROM ${schema.catalog}.information_schema.tables WHERE table_schema = '${schema.name}'`;
		const tableRows = await executeTrinoQuery(client, tableQuery);

		for (const [tableNameRaw, tableTypeRaw] of tableRows) {
			const tableName = tableNameRaw ?? '';
			const reportedType = tableTypeRaw ?? '';
			if (!tableName) continue;

			// Get columns first
			let columns: TrinoColumn[] = [];
			try {
				const columnsQuery = `SHOW COLUMNS FROM ${schema.catalog}.${schema.name}.${tableName}`;
				const columnRows = await executeTrinoQuery(client, columnsQuery);
				columns = columnRows
					.map(row => ({
						name: row[0] ?? '',
						type: row[1] ?? '',
						nullable: row[3] !== 'NO', // Column 3 is Null (YES/NO)
					}))
					.filter(col => col.name && col.type);
			} catch (_) {
				// console.log(`[DEBUG] Failed to get columns for ${tableName}`);
			}

			// Determine actual object type using multiple strategies
			let actualType: 'TABLE' | 'VIEW' | 'MATERIALIZED VIEW' = 'TABLE';

			const VIEW_TYPE = 'VIEW';
			const MATERIALIZED_VIEW_TYPE = 'MATERIALIZED VIEW';

			// Strategy 1: Check table comments (most reliable for MySQL)
			const commentKey = `${schema.catalog}.${schema.name}.${tableName}`;
			const comment = tableComments.get(commentKey);
			if (comment) {
				if (comment.toUpperCase() === 'VIEW') {
					actualType = VIEW_TYPE;
				} else if (comment.toUpperCase().includes('MATERIALIZED')) {
					actualType = MATERIALIZED_VIEW_TYPE;
				}
			}

			// Strategy 2: Check if reported type gives us a hint (some connectors might work)
			if (actualType === 'TABLE' && reportedType.toUpperCase() === VIEW_TYPE) {
				actualType = VIEW_TYPE;
			} else if (
				actualType === 'TABLE' &&
				reportedType.toUpperCase() === MATERIALIZED_VIEW_TYPE
			) {
				actualType = MATERIALIZED_VIEW_TYPE;
			}

			// Strategy 3: Try to get CREATE statement to determine type
			if (actualType === 'TABLE') {
				try {
					const createQuery = `SHOW CREATE TABLE ${schema.catalog}.${schema.name}.${tableName}`;
					const createRows = await executeTrinoQuery(client, createQuery);
					if (createRows.length > 0 && createRows[0] && createRows[0][0]) {
						const createStatement = createRows[0][0].toString();
						const upperStatement = createStatement.toUpperCase();

						// Check for VIEW patterns
						if (
							upperStatement.includes('CREATE VIEW') ||
							upperStatement.includes('CREATE OR REPLACE VIEW')
						) {
							actualType = VIEW_TYPE;
						} else if (upperStatement.includes('CREATE MATERIALIZED VIEW')) {
							actualType = MATERIALIZED_VIEW_TYPE;
						} else if (
							upperStatement.includes('SELECT') &&
							upperStatement.includes('FROM') &&
							!upperStatement.includes('CREATE TABLE')
						) {
							// Sometimes views are shown as CREATE TABLE but contain SELECT...FROM
							actualType = VIEW_TYPE;
						}
					}
				} catch (_) {
					// Ignore errors from SHOW CREATE TABLE
				}
			}

			// Strategy 4: Compare column counts (views often have fewer columns than source tables)
			if (actualType === 'TABLE' && columns.length > 0) {
				try {
					// Check if this might be a view by looking for a table with similar name but more columns
					const baseName = tableName
						.replace(/_view$|_v$|_mv$|_materialized$/i, '')
						.replace(/^active_|^v_/i, '');
					if (baseName !== tableName) {
						// This table has a view-like name, check if base table exists
						const baseTableQuery = `SELECT COUNT(*) FROM ${schema.catalog}.information_schema.columns WHERE table_schema = '${schema.name}' AND table_name = '${baseName}'`;
						const baseResult = await executeTrinoQuery(client, baseTableQuery);
						if (
							baseResult.length > 0 &&
							baseResult[0] &&
							baseResult[0][0] !== undefined
						) {
							const baseColumnCount = Number(baseResult[0][0]);
							if (baseColumnCount > columns.length) {
								actualType = VIEW_TYPE;
							}
						}
					}
				} catch (_) {
					// Ignore errors
				}
			}

			// Strategy 5: Use naming conventions as a final fallback
			if (actualType === 'TABLE') {
				const lowerName = tableName.toLowerCase();
				if (
					lowerName.endsWith('_view') ||
					lowerName.endsWith('_v') ||
					lowerName.includes('_view_') ||
					lowerName.startsWith('v_') ||
					lowerName.startsWith('active_')
				) {
					actualType = VIEW_TYPE;
				} else if (
					lowerName.endsWith('_mv') ||
					lowerName.endsWith('_materialized') ||
					lowerName.includes('_mv_')
				) {
					actualType = MATERIALIZED_VIEW_TYPE;
				}
			}

			// Add to appropriate collection

			if (actualType === VIEW_TYPE) {
				views.push({
					catalog: schema.catalog,
					schema: schema.name,
					name: tableName,
					columns,
				});
			} else if (actualType === MATERIALIZED_VIEW_TYPE) {
				materializedViews.push({
					catalog: schema.catalog,
					schema: schema.name,
					name: tableName,
					columns,
				});
			} else {
				tables.push({
					catalog: schema.catalog,
					schema: schema.name,
					name: tableName,
					type: 'BASE TABLE',
					columns,
				});
			}
		}
	}

	// 5. Functions - Note: Most Trino connectors don't expose functions
	let functions: TrinoFunction[] = [];
	let procedures: TrinoProcedure[] = [];
	for (const schema of schemas) {
		const { functions: passthroughFuncs, procedures: passthroughProcs } =
			await fetchTrinoFunctionsAndProceduresPassthrough(
				client,
				schema.catalog,
				schema.name,
			);
		functions = functions.concat(passthroughFuncs);
		procedures = procedures.concat(passthroughProcs);
	}

	return {
		catalogs,
		schemas,
		tables,
		functions,
		views,
		materializedViews,
		procedures,
	};
}
