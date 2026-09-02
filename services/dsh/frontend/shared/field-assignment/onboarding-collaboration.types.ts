export type OnboardingCollaborationMessage = {
  readonly id: string;
  readonly threadId: string;
  readonly senderActorId: string;
  readonly senderSurface: "app-field" | "control-panel";
  readonly body: string;
  readonly attachmentMediaRefs: readonly string[];
  readonly clientMessageId: string;
  readonly sequenceNumber: number;
  readonly createdAt: string;
};

export type OnboardingChangeRequest = {
  readonly id: string;
  readonly threadId: string;
  readonly targetKind: "draft" | "document" | "assignment";
  readonly targetId: string;
  readonly requestedByActorId: string;
  readonly reason: string;
  readonly status: "open" | "responded" | "resolved" | "cancelled";
  readonly createdAt: string;
};

export type OnboardingCollaborationView = {
  readonly partnerVersion: number;
  readonly thread: {
    readonly id: string;
    readonly partnerId: string;
    readonly assignmentId?: string;
    readonly documentId?: string;
    readonly status: "open" | "resolved" | "closed";
    readonly version: number;
  };
  readonly messages: readonly OnboardingCollaborationMessage[];
  readonly changeRequests: readonly OnboardingChangeRequest[];
  readonly unreadCount: number;
};

export type OnboardingCollaborationMessageInput = {
  readonly body: string;
  readonly clientMessageId: string;
};

export type OnboardingChangeRequestInput = {
  readonly targetKind: "draft" | "document" | "assignment";
  readonly targetId: string;
  readonly reason: string;
  readonly expectedVersion: number;
  readonly idempotencyKey?: string;
  readonly correlationId?: string;
  readonly toStatus: "documents_missing" | "ops_rejected";
};

