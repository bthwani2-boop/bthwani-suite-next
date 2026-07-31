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
  readonly resolutionNote?: string | undefined;
  readonly wltLedgerReference?: string | undefined;
};

export type TransitionProviderIncidentResponse = {
  readonly incident: ProviderIncident;
};

export type ProviderIncidentTransition = {
  readonly id: string;
  readonly incidentId: string;
  readonly fromStatus: ProviderIncidentStatus;
  readonly toStatus: ProviderIncidentStatus;
  readonly resolutionNote?: string | undefined;
  readonly wltLedgerReference?: string | undefined;
  readonly changedByActorId: string;
  readonly createdAt: string;
};
