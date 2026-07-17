/**
 * This file mirrors core/platform-control/contracts/platform-control.openapi.yaml.
 * Regenerate with `pnpm run openapi:generate:platform-control` when the locked
 * generator is available.
 */

export interface paths {
  "/platform/health": Record<string, unknown>;
  "/platform/readiness": Record<string, unknown>;
  "/platform/v1/runtime-config": Record<string, unknown>;
  "/platform/v1/runtime-config/effective": Record<string, unknown>;
  "/platform/v1/variables": Record<string, unknown>;
  "/platform/v1/variables/{key}": Record<string, unknown>;
  "/platform/v1/feature-flags": Record<string, unknown>;
  "/platform/v1/services": Record<string, unknown>;
  "/platform/v1/health": Record<string, unknown>;
  "/platform/v1/audit-events": Record<string, unknown>;
  "/platform/v1/change-sets": Record<string, unknown>;
  "/platform/v1/change-sets/{id}": Record<string, unknown>;
  "/platform/v1/change-sets/{id}/validate": Record<string, unknown>;
  "/platform/v1/change-sets/{id}/submit": Record<string, unknown>;
  "/platform/v1/change-sets/{id}/approve": Record<string, unknown>;
  "/platform/v1/change-sets/{id}/reject": Record<string, unknown>;
  "/platform/v1/change-sets/{id}/apply": Record<string, unknown>;
  "/platform/v1/change-sets/{id}/rollback": Record<string, unknown>;
  "/platform/v1/rollouts": Record<string, unknown>;
  "/platform/v1/rollouts/{id}/advance": Record<string, unknown>;
  "/platform/v1/rollouts/{id}/pause": Record<string, unknown>;
  "/platform/v1/rollouts/{id}/abort": Record<string, unknown>;
  "/platform/v1/rollouts/{id}/rollback": Record<string, unknown>;
}

export type webhooks = Record<string, never>;

export interface components {
  schemas: {
    PlatformControlState:
      | "FIX_REQUIRED"
      | "PARTIALLY_BOUND"
      | "UNKNOWN_HEALTH"
      | "ROLLBACK_UNAVAILABLE"
      | "CONTRACT_REQUIRED"
      | "READ_ONLY_BOUND"
      | "OPERATIONAL";
    PlatformChangeSetStatus:
      | "draft"
      | "validated"
      | "submitted"
      | "approved"
      | "rejected"
      | "applied"
      | "rolled_back"
      | "failed";
    PlatformChangeTargetType: "variable" | "feature_flag";
    PlatformRuntimeSnapshot: {
      status: components["schemas"]["PlatformControlState"];
      revision: string;
      generatedAt: string;
      variablesState: components["schemas"]["PlatformControlState"];
      flagsState: components["schemas"]["PlatformControlState"];
      rolloutsState: components["schemas"]["PlatformControlState"];
      healthState: components["schemas"]["PlatformControlState"];
      auditState: components["schemas"]["PlatformControlState"];
      rollbackState: components["schemas"]["PlatformControlState"];
      servicesState: components["schemas"]["PlatformControlState"];
      evidence: string[];
    };
    PlatformEffectiveRuntimeConfig: {
      revision: string;
      stale: boolean;
      fallbackUsed: boolean;
      evaluationTrace: string[];
      values: Record<string, unknown>;
    };
    PlatformVariable: {
      key: string;
      ownerService: string;
      valueType: string;
      classification: string;
      scopeType: string;
      scopeId?: string;
      value?: unknown;
      revision: string;
      status: components["schemas"]["PlatformControlState"];
      effectiveFrom?: string;
      expiresAt?: string;
    };
    PlatformFeatureFlag: {
      key: string;
      ownerService: string;
      status: components["schemas"]["PlatformControlState"];
      revision: string;
      enabled?: boolean;
      targeting?: Record<string, unknown>;
    };
    PlatformServicePosture: {
      service: string;
      state: components["schemas"]["PlatformControlState"];
      evidenceSource: string;
    };
    PlatformHealthSnapshot: {
      state: components["schemas"]["PlatformControlState"];
      checkedAt: string;
      services: components["schemas"]["PlatformServicePosture"][];
    };
    PlatformAuditEvent: {
      id: string;
      changeSetId?: string;
      action: string;
      actorId: string;
      actorRoles?: string[];
      createdAt: string;
      status: string;
      reason?: string;
      correlationId?: string;
    };
    PlatformChangeSetItem: {
      id: string;
      targetType: components["schemas"]["PlatformChangeTargetType"];
      targetKey: string;
      ownerService: string;
      scopeType: string;
      scopeId?: string;
      valueType: string;
      classification: string;
      expectedRevision: number;
      beforeValue?: unknown;
      proposedValue: unknown;
      appliedRevision?: number;
    };
    PlatformChangeSet: {
      id: string;
      title: string;
      reason: string;
      impactAssessment: string;
      rollbackPlan: string;
      status: components["schemas"]["PlatformChangeSetStatus"];
      proposerActorId: string;
      approverActorId?: string;
      appliedByActorId?: string;
      rejectedByActorId?: string;
      rejectionReason?: string;
      version: number;
      createdAt: string;
      updatedAt: string;
      validatedAt?: string;
      submittedAt?: string;
      approvedAt?: string;
      rejectedAt?: string;
      appliedAt?: string;
      rolledBackAt?: string;
      items: components["schemas"]["PlatformChangeSetItem"][];
    };
    CreatePlatformChangeSetItemInput: {
      targetType: components["schemas"]["PlatformChangeTargetType"];
      targetKey: string;
      ownerService: string;
      scopeType?: string;
      scopeId?: string;
      valueType?: string;
      classification?: string;
      expectedRevision: number;
      proposedValue: unknown;
    };
    CreatePlatformChangeSetInput: {
      title: string;
      reason: string;
      impactAssessment: string;
      rollbackPlan: string;
      items: components["schemas"]["CreatePlatformChangeSetItemInput"][];
    };
    RejectPlatformChangeSetInput: {
      reason: string;
    };
    PlatformApiError: {
      code: string;
      message: string;
    };
  };
  responses: {
    PublicHealth: Record<string, unknown>;
    PlatformError: Record<string, unknown>;
    PlatformChangeSetResponse: Record<string, unknown>;
    RolloutWorkflowRequired: Record<string, unknown>;
  };
  parameters: {
    ChangeSetId: string;
    RolloutId: string;
  };
  requestBodies: never;
  headers: never;
  pathItems: never;
}

export type $defs = Record<string, never>;
export interface operations {}
