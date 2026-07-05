/**
 * Unified API error envelope for BThwani frontend surfaces.
 *
 * Replaces per-adapter ad-hoc error shapes with a single canonical type.
 * Classifiers translate raw HTTP/network errors from DSH and WLT HTTP clients
 * into structured `BthwaniApiError` values that screens can switch on.
 *
 * Usage:
 *   const err = classifyDshError(caughtError);
 *   if (err.kind === 'AUTH_REQUIRED') { ... }
 */

export type BthwaniApiErrorKind =
  | "AUTH_REQUIRED"
  | "PERMISSION_DENIED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "SERVICE_UNAVAILABLE"
  | "PAYMENT_REFERENCE_NOT_FOUND"
  | "STORE_NOT_SERVICEABLE"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "UNKNOWN";

export type BthwaniApiError = {
  readonly kind: BthwaniApiErrorKind;
  readonly httpStatus?: number;
  readonly correlationId?: string;
  readonly message?: string;
};

// ─── DSH error classifier ────────────────────────────────────────────────────
// Input: errors thrown by createDsh*HttpClient — shape: { kind, status?, body?, message? }

export function classifyDshError(error: unknown): BthwaniApiError {
  const e = error as { kind?: string; status?: number; body?: string; message?: string };

  if (e?.kind === "network") {
    if (e.message?.includes("timed out") || e.message?.includes("timeout")) {
      return { kind: "TIMEOUT", message: e.message };
    }
    return { kind: "NETWORK_ERROR", message: e.message };
  }

  if (e?.kind === "http") {
    switch (e.status) {
      case 401: return { kind: "AUTH_REQUIRED", httpStatus: 401 };
      case 403: return { kind: "PERMISSION_DENIED", httpStatus: 403 };
      case 404: return { kind: "NOT_FOUND", httpStatus: 404 };
      case 409:
      case 422: return { kind: "VALIDATION_ERROR", httpStatus: e.status };
      case 503:
      case 502:
      case 504: return { kind: "SERVICE_UNAVAILABLE", httpStatus: e.status };
      default:
        if (e.status && e.status >= 500) return { kind: "SERVICE_UNAVAILABLE", httpStatus: e.status };
        return { kind: "UNKNOWN", httpStatus: e.status };
    }
  }

  return { kind: "UNKNOWN" };
}

// ─── WLT error classifier ────────────────────────────────────────────────────
// Input: WltReferenceApiResult<T> when ok === false — shape: { ok, kind, status?, message }

export function classifyWltError(error: {
  readonly ok: false;
  readonly kind?: "http" | "network";
  readonly status?: number;
  readonly message?: string;
}): BthwaniApiError {
  if (error.kind === "network") {
    if (error.message?.includes("timed out") || error.message?.includes("timeout")) {
      return { kind: "TIMEOUT", message: error.message };
    }
    return { kind: "NETWORK_ERROR", message: error.message };
  }

  if (error.kind === "http") {
    switch (error.status) {
      case 401: return { kind: "AUTH_REQUIRED", httpStatus: 401 };
      case 403: return { kind: "PERMISSION_DENIED", httpStatus: 403 };
      case 404: return { kind: "PAYMENT_REFERENCE_NOT_FOUND", httpStatus: 404 };
      case 503:
      case 502:
      case 504: return { kind: "SERVICE_UNAVAILABLE", httpStatus: error.status };
      default:
        if (error.status && error.status >= 500) return { kind: "SERVICE_UNAVAILABLE", httpStatus: error.status };
        return { kind: "UNKNOWN", httpStatus: error.status, message: error.message };
    }
  }

  // Legacy: old WltReferenceApiResult had no kind field
  if (error.message) return { kind: "UNKNOWN", message: error.message };
  return { kind: "UNKNOWN" };
}
