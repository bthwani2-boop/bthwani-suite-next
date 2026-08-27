import type { ProviderIncident, ProviderOperationalCore } from "./workforce.types";

export type PromoteCaptainInput = {
  readonly completedDeliveries: number;
  readonly completionRateBasisPoints: number;
  readonly severeIncidentFree: boolean;
  readonly evidenceMediaRefs: readonly string[];
  readonly decisionNote: string;
};

export type PromoteCaptainResponse = {
  readonly operationalCore: ProviderOperationalCore;
};

export type ProviderIncidentStatus =
  | "reported"
  | "under_review"
  | "provider_notified"
  | "appeal_window"
  | "approved"
  | "rejected"
  | "financial_action_posted"
  | "closed"
  | "reversed";

export type TransitionProviderIncidentInput = {
  readonly toStatus: ProviderIncidentStatus;
  readonly resolutionNote: string;
  readonly expectedVersion: number;
};

export type TransitionProviderIncidentResponse = {
  readonly incident?: ProviderIncident | undefined;
  readonly financialCommand?: ProviderPenaltyCommand | undefined;
  readonly replayed?: boolean | undefined;
};

export type ProviderPenaltyCommandLifecycle =
  | "READY"
  | "IN_FLIGHT"
  | "REMOTE_OUTCOME_UNKNOWN"
  | "REMOTE_CONFIRMED"
  | "LOCAL_PROJECTION_PENDING"
  | "RECONCILING"
  | "RETRY_SCHEDULED"
  | "COMPLETED"
  | "PERMANENTLY_REJECTED"
  | "HISTORIC_UNPROVEN";

export type ProviderPenaltyCommand = {
  readonly id: string;
  readonly incidentId: string;
  readonly incidentSourceVersion: number;
  readonly operation: "post" | "reverse";
  readonly commandIdempotencyKey: string;
  readonly lifecycleState: ProviderPenaltyCommandLifecycle;
  readonly attemptCount: number;
  readonly readbackAttemptCount: number;
  readonly reconciliationState: "NOT_REQUIRED" | "REQUIRED" | "FOUND" | "ABSENT" | "UNPROVEN";
  readonly remotePenaltyId?: string | undefined;
  readonly remoteLedgerTransactionId?: string | undefined;
  readonly terminalDisposition?: string | undefined;
};
