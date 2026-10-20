export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "ACCOUNT_LOCKED"
  | "INVALID_CREDENTIALS"
  | "MUST_CHANGE_PASSWORD"
  | "LAST_SECRETARY_PROTECTED"
  | "SELF_DEACTIVATION_FORBIDDEN"
  | "CONFLICT"
  | "LOCKED_RECORD"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly isAppError = true;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: { code: ErrorCode | "UNKNOWN_ERROR"; message: string } };

export function successResult<T>(data: T): Result<T> {
  return { success: true, data };
}

export function errorResult<T = never>(code: ErrorCode | "UNKNOWN_ERROR", message: string): Result<T> {
  return { success: false, error: { code, message } };
}

export function handleActionError(error: unknown): Result<never> {
  if (error instanceof AppError) {
    return errorResult(error.code, error.message);
  }
  // Never leak raw internal exceptions to the client
  return errorResult("INTERNAL_ERROR", "An unexpected error occurred. Please try again.");
}
