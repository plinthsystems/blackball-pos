export type DomainErrorCode =
  | "TABLE_NOT_AVAILABLE"
  | "SESSION_NOT_ACTIVE"
  | "SESSION_NOT_PAUSED"
  | "EXTENSION_CONFLICT"
  | "OVERLAPPING_SESSION"
  | "PRICING_NOT_FOUND"
  | "INVALID_STATUS_TRANSITION"
  | "UNAUTHORIZED";

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
    public readonly metadata: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "DomainError";
  }
}
