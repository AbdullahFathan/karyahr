/**
 * Base application error with an HTTP status code.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Resource was not found.
 */
export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

/**
 * Request payload failed validation.
 */
export class ValidationError extends AppError {
  constructor(message = "Validation failed") {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

/**
 * Request conflicts with current state.
 */
export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message, 409, "CONFLICT");
    this.name = "ConflictError";
  }
}

/**
 * Caller is not authenticated.
 */
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

/**
 * Caller lacks permission for the resource.
 */
export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export type ErrorBody = {
  readonly error: string;
  readonly message: string;
  readonly requestId?: string;
};

/**
 * Maps an unknown error to an HTTP status and JSON body.
 */
export function mapError(
  error: unknown,
  requestId?: string,
): { readonly statusCode: number; readonly body: ErrorBody } {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: error.code,
        message: error.message,
        requestId,
      },
    };
  }

  if (isZodError(error)) {
    const first = error.issues[0];
    return {
      statusCode: 400,
      body: {
        error: "VALIDATION_ERROR",
        message: first?.message ?? "Validation failed",
        requestId,
      },
    };
  }

  return {
    statusCode: 500,
    body: {
      error: "INTERNAL_ERROR",
      message: "Internal server error",
      requestId,
    },
  };
}

function isZodError(error: unknown): error is { issues: ReadonlyArray<{ message: string }> } {
  return (
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray((error as { issues: unknown }).issues) &&
    "name" in error &&
    (error as { name: unknown }).name === "ZodError"
  );
}
