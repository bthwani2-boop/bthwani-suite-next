export type FieldOnboardingAssignmentStatus = "assigned" | "in_progress" | "draft_linked" | "cancelled";

export type FieldOnboardingAssignment = {
  readonly id: string;
  readonly operatorContextId: string;
  readonly fieldActorId: string;
  readonly businessTaskKey: string;
  readonly storeNameHint: string;
  readonly phoneHint?: string;
  readonly addressHint?: string;
  readonly locationLatitude?: number;
  readonly locationLongitude?: number;
  readonly status: FieldOnboardingAssignmentStatus;
  readonly priority: "low" | "normal" | "high" | "urgent";
  readonly dueAt?: string;
  readonly slaMinutes: number;
  readonly overdue: boolean;
  readonly draftPartnerId?: string;
  readonly version: number;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type CreateFieldOnboardingAssignmentInput = {
  readonly fieldActorId: string;
  readonly businessTaskKey: string;
  readonly storeNameHint: string;
  readonly phoneHint?: string;
  readonly addressHint?: string;
  readonly locationLatitude?: number;
  readonly locationLongitude?: number;
  readonly priority?: "low" | "normal" | "high" | "urgent";
  readonly dueAt?: string;
  readonly slaMinutes?: number;
};

export type FieldOnboardingAssignmentTransitionInput = {
  readonly expectedVersion: number;
  readonly reason?: string;
};

export type ReassignFieldOnboardingAssignmentInput = FieldOnboardingAssignmentTransitionInput & {
  readonly fieldActorId: string;
  readonly handoff?: boolean;
};
