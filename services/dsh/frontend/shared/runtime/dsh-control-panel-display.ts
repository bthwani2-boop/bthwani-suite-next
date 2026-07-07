/**
 * dsh-control-panel-display.ts
 * Central display utilities shared across DSH control-panel surfaces.
 * Display-only — no business logic, no financial state, no API calls.
 */

export type DshControlPanelTone = 'neutral' | 'success' | 'warning' | 'danger';

/**
 * Normalizes data-driven tone labels (from preview/runtime data) to
 * the standard set used by UI components.
 * Used by all operations screens to render status tags and risk badges.
 */
export const DSH_CONTROL_PANEL_TONE_MAP: Record<string, DshControlPanelTone> = {
  warning: 'warning',
  danger: 'danger',
  best: 'success',
  brand: 'neutral',
};

export type DshRecommendationSeverity = 'critical' | 'high' | 'medium' | 'low';
export type DshRecommendationConfidence = 'high' | 'medium' | 'low';

export type DshUnifiedRecommendation = {
  id: string;
  surface: string;
  sourceSurface?: string;
  affectedSurface?: string;
  actor?: string;
  lifecycleStep?: string;
  entityId?: string;
  entityLabel?: string;
  status?: string;
  risk?: string;
  severity: DshRecommendationSeverity;
  confidence: DshRecommendationConfidence;
  affectedEntity: string;
  reason: string;
  evidence: string;
  nextAction: string;
  owner: string;
  expectedImpact: string;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  counterpartRouteHint?: string;
  runtimeBindingStatus?: string;
  counterpartLinks?: readonly unknown[];
};

function getDshRecommendationConfidenceLabel(confidence: DshRecommendationConfidence): string {
  if (confidence === 'high') return 'ثقة عالية';
  if (confidence === 'medium') return 'ثقة متوسطة';
  return 'ثقة منخفضة';
}

export function getDshRecommendationSeverityLabel(severity: DshRecommendationSeverity): string {
  if (severity === 'critical') return 'حرج';
  if (severity === 'high') return 'مرتفع';
  if (severity === 'medium') return 'متوسط';
  return 'منخفض';
}

export const DSH_CROSS_SURFACE_JOURNEYS: readonly DshUnifiedRecommendation[] = [];

/**
 * Resolves a UI tone from an order's backend runtime status string.
 * Matches status values from DshOrderRecord (dsh-order-lifecycle-client.ts).
 */
export function resolveRuntimeOrderStatusTone(status: string): DshControlPanelTone {
  const normalized = status.toLowerCase();
  if (normalized === 'cancelled' || normalized === 'failed_delivery') return 'danger';
  if (normalized === 'pending' || normalized === 'created' || normalized === 'returning_to_store') return 'warning';
  if (normalized === 'delivered' || normalized === 'returned') return 'success';
  return 'neutral';
}
