export type FieldOnboardingAssignmentStatus = "assigned" | "in_progress" | "draft_linked" | "cancelled";

export type FieldOnboardingAssignment = {
  readonly id: string;
  readonly operatorContextId: string;
  readonly fieldActorId: string;
  readonly storeNameHint: string;
  readonly phoneHint?: string;
  readonly addressHint?: string;
  readonly locationLatitude?: number;
  readonly locationLongitude?: number;
  readonly status: FieldOnboardingAssignmentStatus;
  readonly draftPartnerId?: string;
  readonly version: number;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type CreateFieldOnboardingAssignmentInput = {
  readonly fieldActorId: string;
  readonly storeNameHint: string;
  readonly phoneHint?: string;
  readonly addressHint?: string;
  readonly locationLatitude?: number;
  readonly locationLongitude?: number;
};

export type FieldOnboardingAssignmentTransitionInput = {
  readonly expectedVersion: number;
  readonly reason?: string;
};

export type ReassignFieldOnboardingAssignmentInput = FieldOnboardingAssignmentTransitionInput & {
  readonly fieldActorId: string;
};
