export type DshDeliveryProofMethod = "otp_pin" | "photo" | "signature" | "composite";
export type DshDeliveryProofStatus = "submitted" | "pending_review" | "accepted" | "rejected" | "superseded";

export type DshDeliveryPinChallenge = {
  readonly id: string;
  readonly orderId: string;
  readonly assignmentId: string;
  readonly expiresAt: string;
  readonly maxAttempts: number;
  readonly version: number;
};

export type DshDeliveryPinResponse = {
  readonly challenge: DshDeliveryPinChallenge;
  readonly pin: string;
};

export type DshDeliveryProof = {
  readonly id: string;
  readonly assignmentId: string;
  readonly orderId: string;
  readonly captainId: string;
  readonly method: DshDeliveryProofMethod;
  readonly status: DshDeliveryProofStatus;
  readonly hasPhoto: boolean;
  readonly hasSignature: boolean;
  readonly photoMediaRef?: string | null;
  readonly signatureMediaRef?: string | null;
  readonly capturedLatitude?: number | null;
  readonly capturedLongitude?: number | null;
  readonly capturedAt: string;
  readonly submittedAt: string;
  readonly reviewedAt?: string | null;
  readonly reviewedByActorId?: string | null;
  readonly reviewReason?: string | null;
  readonly acceptedAt?: string | null;
  readonly rejectedAt?: string | null;
  readonly version: number;
};

export type DshClientDeliveryProof = Pick<
  DshDeliveryProof,
  "id" | "orderId" | "method" | "status" | "hasPhoto" | "hasSignature" | "capturedAt" | "acceptedAt"
>;

export type DshSubmitDeliveryProofInput = {
  readonly method: DshDeliveryProofMethod;
  readonly pin?: string;
  readonly photoMediaRef?: string;
  readonly signatureMediaRef?: string;
  readonly capturedLatitude?: number;
  readonly capturedLongitude?: number;
  readonly capturedAt?: string;
  readonly idempotencyKey: string;
};

export type DshReviewDeliveryProofInput = {
  readonly expectedVersion: number;
  readonly reason: string;
};

export type DshDeliveryProofErrorKind =
  | "permission_denied"
  | "offline"
  | "not_found"
  | "conflict"
  | "invalid"
  | "error";

export type DshDeliveryProofError = {
  readonly kind: DshDeliveryProofErrorKind;
  readonly code?: string;
  readonly message: string;
};

export type DshDeliveryProofLoadState = "idle" | "loading" | "ready" | "empty" | "offline" | "error";
export type DshDeliveryProofMutationState = "idle" | "submitting" | "pending_review" | "accepted" | "rejected" | "error";
