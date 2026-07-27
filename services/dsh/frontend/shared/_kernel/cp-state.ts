/**
 * Canonical state vocabulary for control-panel screens.
 *
 * The control-panel diagnosis found four different spellings for "you can't
 * see this" spread across screens and controllers: `permission_denied` (69
 * occurrences), `forbidden` (37), `unauthenticated` (24), `blocked` (14) —
 * plus screen-local state machines with their own vocabularies (see
 * `finance/PaymentSessionOperationsScreen.tsx`'s `ScreenState` and
 * `finance/FinanceDashboardScreen.tsx`'s `describeFinanceBlockedReason`).
 * `normalizeCpState` is the single place that collapses all of those onto one
 * 7-value union, which `CpStateView` (Phase 1) renders from.
 *
 * This module lives in `shared/` rather than in the control-panel app's L2
 * component layer because the *producers* of these values are controllers —
 * `services/dsh/frontend/shared/**` — not the screens that render them.
 *
 * NOTE: publishing this module is Phase 0.6 of the control-panel remediation
 * plan. Rewiring `describeFinanceBlockedReason` / `WorkforceErrorState` /
 * the per-screen ternaries to call `normalizeCpState` is Phase 1 — this file
 * does not by itself change any screen's behavior.
 */
import type { BthwaniApiErrorKind } from "./bthwani-frontend-error-classifier";

export type CpStateKind =
  | "loading"
  | "empty"
  | "error"
  | "offline"
  | "unauthenticated"
  | "forbidden"
  | "blocked";

/**
 * Every spelling this codebase currently uses for one of the seven canonical
 * kinds, lower-cased and normalized to snake_case before lookup. Extend this
 * map — never add a new local spelling at a call site.
 */
const REASON_ALIASES: Record<string, CpStateKind> = {
  // loading
  loading: "loading",
  idle: "loading",
  refreshing: "loading",
  pending: "loading",

  // empty
  empty: "empty",
  no_data: "empty",
  no_results: "empty",

  // error (generic failure — not a specific auth/network/permission case)
  error: "error",
  failed: "error",
  conflict: "error",
  validation_error: "error",
  not_found: "error",
  payment_reference_not_found: "error",
  store_not_serviceable: "error",

  // offline / connectivity
  offline: "offline",
  network_error: "offline",
  timeout: "offline",
  service_unavailable: "offline",

  // unauthenticated (no valid session)
  unauthenticated: "unauthenticated",
  auth_required: "unauthenticated",
  unauthorized: "unauthenticated",

  // forbidden (authenticated, but not entitled to this data/action)
  forbidden: "forbidden",
  permission_denied: "forbidden",

  // blocked (a domain precondition prevents the action, distinct from a
  // permission failure — e.g. a DSH<->WLT channel block)
  blocked: "blocked",
  ready: "loading", // "ready" without data yet is treated as still loading
};

/** Maps the lower-level HTTP error classifier's kinds onto the same union. */
const API_ERROR_KIND_ALIASES: Record<BthwaniApiErrorKind, CpStateKind> = {
  AUTH_REQUIRED: "unauthenticated",
  PERMISSION_DENIED: "forbidden",
  VALIDATION_ERROR: "error",
  NOT_FOUND: "error",
  SERVICE_UNAVAILABLE: "offline",
  PAYMENT_REFERENCE_NOT_FOUND: "error",
  STORE_NOT_SERVICEABLE: "error",
  NETWORK_ERROR: "offline",
  TIMEOUT: "offline",
  UNKNOWN: "error",
};

function toSnakeCase(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

/**
 * Normalizes a screen-local or controller-local state reason — a raw string
 * (`"permission_denied"`, `"Forbidden"`, `"NOT_FOUND"`, …) or a
 * `BthwaniApiErrorKind` from the HTTP error classifier — onto the canonical
 * `CpStateKind` union. Unrecognized input falls back to `"error"` rather than
 * throwing, since a state panel must always render something.
 */
export function normalizeCpState(reason: string | BthwaniApiErrorKind | undefined | null): CpStateKind {
  if (!reason) return "error";
  if (reason in API_ERROR_KIND_ALIASES) {
    return API_ERROR_KIND_ALIASES[reason as BthwaniApiErrorKind];
  }
  const key = toSnakeCase(reason);
  return REASON_ALIASES[key] ?? "error";
}
