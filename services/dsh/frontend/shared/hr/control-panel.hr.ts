// Canonical location: dsh/frontend/shared/view-models/control-panel/hr/hr.types.ts
// Authority: dsh/frontend/shared — moved from control-panel/hr/hr.types.ts
// Status: read-only/blocked until backend HR is real.

export type HrWorkspaceId = 'team' | 'readiness' | 'roles' | 'requests' | 'policies';

export type HrWorkspaceMeta = {
  id: HrWorkspaceId;
  label: string;
  runtimeStatus: 'blocked-api-later';
  disabledReason: string;
};
