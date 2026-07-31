/**
 * Canonical render-state vocabulary shared by control-panel consumers.
 *
 * This module owns only the stable type vocabulary. State interpretation must
 * stay with an actually consumed controller or view model; no inactive
 * normalization engine is kept as a parallel authority.
 */
export type CpStateKind =
  | "loading"
  | "empty"
  | "error"
  | "offline"
  | "unauthenticated"
  | "forbidden"
  | "blocked";
