// Canonical location: dsh/frontend/shared/view-models/control-panel/dashboard/dashboard.types.ts
// Authority: dsh/frontend/shared — moved from control-panel/dashboard/dashboard.types.ts

export type DashboardEvidenceLaneId =
  | 'closure-summary'
  | 'section-readiness'
  | 'evidence-stream'
  | 'blockers';

export type DashboardEvidenceLaneMeta = {
  id: DashboardEvidenceLaneId;
  label: string;
  owner: 'dashboard';
  sourcePolicy: 'summary-only' | 'evidence-on-open';
};

const DASHBOARD_EVIDENCE_LANES: readonly DashboardEvidenceLaneMeta[] = [
  { id: 'closure-summary', label: 'ملخص الإغلاق', owner: 'dashboard', sourcePolicy: 'summary-only' },
  { id: 'section-readiness', label: 'جاهزية الأقسام', owner: 'dashboard', sourcePolicy: 'summary-only' },
  { id: 'evidence-stream', label: 'مسار الأدلة', owner: 'dashboard', sourcePolicy: 'evidence-on-open' },
  { id: 'blockers', label: 'العوائق', owner: 'dashboard', sourcePolicy: 'summary-only' },
];
