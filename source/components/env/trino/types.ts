export type TrinoOptions = {
	apiKey?: string;
	url: string;
	user: string;
	password?: string;
	catalog?: string;
	schema?: string;
};

export interface PermitResource {
	key: string;
	name: string;
	description?: string;
	actions: string[];
	attributes?: {
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
	};
}
