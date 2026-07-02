// Canonical location: dsh/frontend/shared/view-models/control-panel/platform/platform.types.ts
// Authority: dsh/frontend/shared — moved from control-panel/platform/*/types files

// ── Appearance Types ──────────────────────────────────────────────────────────
export type AppearanceStatus = 'snapshot-only' | 'contract-needed' | 'ready-for-binding';
export type AppearanceScope = 'Global' | 'Platform' | 'App' | 'Surface' | 'Service';
export type AppearanceRisk = 'low' | 'medium' | 'high' | 'visual-identity';
export type AppearanceOwner = 'Platform' | 'DesignSystem' | 'AppShell' | 'ServiceOwner';

export interface AppearanceRecord {
  id: string;
  label: string;
  owner: AppearanceOwner;
  status: AppearanceStatus;
  scope: AppearanceScope;
  risk: AppearanceRisk;
  currentSnapshotValue: string;
  proposedSnapshotValue: string;
  effectSummary: string;
  auditRollbackHint: string;
  centralColorSystemNote: string;
  reason?: string;
  evidence?: string;
  rollbackTarget?: string;
}

// ── Providers Types ───────────────────────────────────────────────────────────
export type ProviderEnvironment = 'test' | 'sandbox' | 'production';
export type ProviderStatus = 'active' | 'inactive' | 'test-only' | 'pending-approval';
export type ProviderOwner = 'Platform' | 'DesignSystem' | 'ServiceOwner';

export interface ProviderRecord {
  id: string;
  label: string;
  category: string;
  selectedProvider: string;
  /** Always masked — never show real keys */
  maskedCredential: string;
  environment: ProviderEnvironment;
  status: ProviderStatus;
  owner: ProviderOwner;
  priority: number;
  fallbackProvider?: string;
  lastTestResult?: 'pass' | 'fail' | 'not-run';
  rollbackTarget?: string;
  evidence?: string;
  activationNote: string;
}

// ── Services Types ────────────────────────────────────────────────────────────
export type ServiceStatus = 'live' | 'paused' | 'internal-only' | 'pilot' | 'maintenance';
export type ServiceClientVisibility = 'visible' | 'hidden';
export type ServiceScope = 'Global' | 'Region' | 'City' | 'Zone' | 'Service';
export type ServiceOwner = 'Platform' | 'Operations' | 'DesignSystem';
export type ServiceRisk = 'low' | 'medium' | 'high' | 'critical';

export interface ServiceRecord {
  id: string;
  label: string;
  description: string;
  owner: ServiceOwner;
  status: ServiceStatus;
  clientVisibility: ServiceClientVisibility;
  scope: ServiceScope;
  risk: ServiceRisk;
  effectSummary: string;
  auditRollbackHint: string;
  reason?: string;
  evidence?: string;
  rollbackTarget?: ServiceStatus;
}

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
