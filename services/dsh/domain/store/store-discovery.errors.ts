export type DshErrorCode =
  | "INVALID_PARAMETER"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

export class DshDomainError extends Error {
  constructor(
    public readonly code: DshErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DshDomainError";
  }
}

export class DshNotFoundError extends DshDomainError {
  constructor(resourceType: string, id: string) {
    super("NOT_FOUND", `${resourceType} not found: ${id}`);
    this.name = "DshNotFoundError";
  }
}

export class DshInvalidParameterError extends DshDomainError {
  constructor(message: string) {
    super("INVALID_PARAMETER", message);
    this.name = "DshInvalidParameterError";
  }
}
