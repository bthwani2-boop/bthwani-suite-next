// Canonical location: dsh/frontend/shared/view-models/control-panel/platform/platform.types.ts
// Authority: dsh/frontend/shared — moved from control-panel/platform/*/types files

// ── Appearance Types ──────────────────────────────────────────────────────────


// ── Providers Types ───────────────────────────────────────────────────────────


// ── Services Types ────────────────────────────────────────────────────────────


// ── Vars Types ────────────────────────────────────────────────────────────────
export type DshPlatformVarOwner = 'DSH' | 'WLT' | 'Provider';

export type DshPlatformVarStatus =
  | 'runtime-bound'
  | 'contract-required'
  | 'read-only-reference'
  | 'disabled-by-policy';

export type DshPlatformVarScope =
  | 'Global'
  | 'Service'
  | 'Region'
  | 'City'
  | 'Zone'
  | 'Category'
  | 'Subcategory'
  | 'Store';

export type DshPlatformVarRisk = 'low' | 'medium' | 'high' | 'financial';

export type DshPlatformVarRecord = {
  id: string;
  key: string;
  label: string;
  owner: DshPlatformVarOwner;
  status: DshPlatformVarStatus;
  scope: DshPlatformVarScope;
  risk: DshPlatformVarRisk;
  currentValue: string;
  proposedValue?: string | null;
  effectSummary: string;
  auditRollbackHint: string;
  precedenceNote: string;
  affectedSurfaces: readonly string[];
  auditRequired: boolean;
  mutationAllowed: false;
};

export type DshPlatformProviderControlRecord = DshPlatformVarRecord & {
  providerId: string;
  capability: string;
  priority: string;
  fallback: string;
  mode: string;
  testResult: string;
  rollbackTarget: string;
};

export type DshPlatformScopeLayer = {
  id: string;
  scope: DshPlatformVarScope;
  order: number;
  title: string;
  description: string;
  ownerGuard: string;
  note: string;
};

export type DshPlatformPolicyScenario = {
  id: string;
  title: string;
  owner: DshPlatformVarOwner;
  scope: DshPlatformVarScope;
  priority: string;
  relatedKeys: readonly string[];
  expectedImpact: string;
  guardrail: string;
  blockedReason: string;
};

export type DshPlatformAuditEntry = {
  id: string;
  title: string;
  actor: string;
  event: string;
  targetKey: string;
  stateLabel: string;
  evidenceHint: string;
  rollbackHint: string;
};
