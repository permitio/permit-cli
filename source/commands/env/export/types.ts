export interface ExportState {
	status: string;
	isComplete: boolean;
	error: string | null;
	warnings: string[];
}

export interface ExportOptions {
	key?: string;
	file?: string;
}

export interface HCLGenerator {
	generateHCL(): Promise<string>;
	name: string;
}

export interface WarningCollector {
	addWarning(warning: string): void;
	getWarnings(): string[];
}
