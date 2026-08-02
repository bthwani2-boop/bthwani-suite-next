// WLT-for-DSH Field Commission read-only types.
// Enforces read-only design; no financial mutations are declared or allowed here.

export type WltFieldCommissionStatus =
  | "not_available"
  | "loading"
  | "eligible_pending_review"
  | "approved_pending_settlement"
  | "settled"
  | "held_for_evidence"
  | "rejected"
  | "error";

export interface WltDshFieldCommissionReference {
  readonly id: string;
  readonly partnerId: string;
  readonly partnerName: string;
  readonly amountMinorUnits: number;
  readonly currency: string;
  readonly status: WltFieldCommissionStatus;
  readonly description: string;
  readonly evidenceRequired: boolean;
  readonly settledAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
