/**
 * Generated-compatible Platform Control API types.
 * Source contract: core/platform-control/contracts/platform-control.openapi.yaml
 */
export interface paths {
  "/platform/v1/runtime-config": {
    get: {
      responses: {
        200: { content: { "application/json": components["schemas"]["PlatformRuntimeSnapshot"] } };
      };
    };
  };
  "/platform/v1/runtime-config/effective": {
    get: {
      parameters: {
        query?: {
          surface?: string;
          city?: string;
          zone?: string;
        };
      };
      responses: {
        200: { content: { "application/json": components["schemas"]["PlatformEffectiveRuntimeConfig"] } };
      };
    };
  };
  "/platform/v1/variables": {
    get: {
      responses: {
        200: { content: { "application/json": { variables: components["schemas"]["PlatformVariable"][] } } };
      };
    };
  };
  "/platform/v1/variables/{key}": {
    get: {
      parameters: { path: { key: string } };
      responses: {
        404: { content: { "application/json": components["schemas"]["PlatformApiError"] } };
      };
    };
  };
  "/platform/v1/feature-flags": {
    get: {
      responses: {
        200: { content: { "application/json": { flags: components["schemas"]["PlatformFeatureFlag"][] } } };
      };
    };
  };
  "/platform/v1/services": {
    get: {
      responses: {
        200: { content: { "application/json": { services: components["schemas"]["PlatformServicePosture"][] } } };
      };
    };
  };
  "/platform/v1/health": {
    get: {
      responses: {
        200: { content: { "application/json": components["schemas"]["PlatformHealthSnapshot"] } };
      };
    };
  };
  "/platform/v1/audit-events": {
    get: {
      responses: {
        200: { content: { "application/json": { events: components["schemas"]["PlatformAuditEvent"][] } } };
      };
    };
  };
  "/platform/v1/change-sets": {
    get: {
      responses: {
        200: { content: { "application/json": { changeSets: components["schemas"]["PlatformChangeSet"][] } } };
      };
    };
    post: {
      responses: {
        409: { content: { "application/json": components["schemas"]["PlatformApiError"] } };
      };
    };
  };
  "/platform/v1/change-sets/{id}/validate": operations["blockedChangeWorkflow"];
  "/platform/v1/change-sets/{id}/submit": operations["blockedChangeWorkflow"];
  "/platform/v1/change-sets/{id}/approve": operations["blockedChangeWorkflow"];
  "/platform/v1/change-sets/{id}/reject": operations["blockedChangeWorkflow"];
  "/platform/v1/change-sets/{id}/apply": operations["blockedChangeWorkflow"];
  "/platform/v1/change-sets/{id}/rollback": operations["blockedChangeWorkflow"];
  "/platform/v1/rollouts": operations["blockedRolloutWorkflow"];
  "/platform/v1/rollouts/{id}/advance": operations["blockedRolloutWorkflow"];
  "/platform/v1/rollouts/{id}/pause": operations["blockedRolloutWorkflow"];
  "/platform/v1/rollouts/{id}/abort": operations["blockedRolloutWorkflow"];
  "/platform/v1/rollouts/{id}/rollback": operations["blockedRolloutWorkflow"];
}

export interface operations {
  blockedChangeWorkflow: {
    post: {
      parameters: { path: { id: string } };
      responses: {
        409: { content: { "application/json": components["schemas"]["PlatformApiError"] } };
      };
    };
  };
  blockedRolloutWorkflow: {
    post: {
      parameters?: { path?: { id?: string } };
      responses: {
        409: { content: { "application/json": components["schemas"]["PlatformApiError"] } };
      };
    };
  };
}

export interface components {
  schemas: {
    PlatformControlState:
      | "FIX_REQUIRED"
      | "PARTIALLY_BOUND"
      | "UNKNOWN_HEALTH"
      | "ROLLBACK_UNAVAILABLE"
      | "CONTRACT_REQUIRED"
      | "READ_ONLY_BOUND";
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
      revision: string;
      status: components["schemas"]["PlatformControlState"];
      effectiveFrom?: string;
      expiresAt?: string;
    };
    PlatformFeatureFlag: {
      key: string;
      status: components["schemas"]["PlatformControlState"];
      revision: string;
      enabled?: boolean;
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
      action: string;
      actorId: string;
      createdAt: string;
      status: components["schemas"]["PlatformControlState"];
    };
    PlatformChangeSet: {
      id: string;
      status: components["schemas"]["PlatformControlState"];
      createdAt: string;
    };
    PlatformApiError: {
      code: string;
      message: string;
    };
  };
}
