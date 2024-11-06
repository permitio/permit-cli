type ErrorName =
	| 'API_ERROR' // Error response from api calls
	| 'VALIDATION_ERROR' // Error from validation
	| 'AUTH_ERROR' // Error from authentication
	| 'INTERNAL_ERROR'; // (Other Errors) All type of error excluding above 

export class AppError extends Error {
	name: ErrorName;
	message: string;
	cause?: any;

	constructor({ name, message, cause }: { name: ErrorName, message: string, cause?: any }) {
		super(message);
		this.name = name;
		this.cause = cause;
	}
}


export class APIError extends AppError {
	status: string;
	statusCode: number;
	path: string;

	constructor({ message, cause, status, statusCode, path }: { message: string, cause?: any, status: string, statusCode: number, path: string }) {
		super({ name: 'API_ERROR', message, cause });
		this.status = status;
		this.statusCode = statusCode;
		this.path = path;
	}
}


export class ValidationError extends AppError {
	constructor({ message, cause }: { message: string, cause?: any }) {
		super({ name: 'VALIDATION_ERROR', message, cause });
	}
}


export class AuthError extends AppError {
	constructor({ message, cause }: { message: string, cause?: any }) {
		super({ name: 'AUTH_ERROR', message, cause });
	}
}

