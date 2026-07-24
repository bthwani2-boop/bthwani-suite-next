/** Volatile, computed-on-read SLA projection shared by pickup and partner_delivery reads. */
export type DshSlaState = "not_started" | "on_track" | "due_soon" | "overdue" | "closed";

export type DshSlaProjection = {
  readonly state: DshSlaState;
  readonly currentLeg: string;
  readonly legStartedAt?: string | null;
  readonly legDeadline?: string | null;
  readonly remainingSeconds: number;
};
