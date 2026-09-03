export type DshRequestErrorKind = "http" | "network" | "invalid_request";

type DshRequestErrorDetails = {
  readonly status?: number | undefined;
  readonly body?: string | undefined;
  readonly code?: string | undefined;
  readonly correlationId?: string | undefined;
  readonly message?: string | undefined;
};

export class DshRequestError extends Error {
  readonly kind: DshRequestErrorKind;
  readonly status?: number;
  readonly body?: string;
  readonly code?: string;
  readonly correlationId?: string;

  constructor(kind: DshRequestErrorKind, details: DshRequestErrorDetails = {}) {
    super(details.message ?? kind);
    this.name = "DshRequestError";
    this.kind = kind;
    if (details.status !== undefined) this.status = details.status;
    if (details.body !== undefined) this.body = details.body;
    if (details.code !== undefined) this.code = details.code;
    if (details.correlationId !== undefined) this.correlationId = details.correlationId;
  }
}
