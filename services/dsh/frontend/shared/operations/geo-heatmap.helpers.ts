// Canonical location: dsh/frontend/shared/view-models/control-panel/operations/geo-heatmap.helpers.ts
// Authority: dsh/frontend/shared -- moved from control-panel/operations/geo-heatmap.helpers.ts
// Pure resolver helpers for GeoHeatmapScreen.
// All functions are stateless — no hooks, no imports from React.
// Extracted to keep GeoHeatmapScreen under 330 lines.

import type { DshSurfaceId } from './dsh-operational.contract';

type GeoLifecycleStep =
  | 'tracking'
  | 'delivery'
  | 'partner-preparation'
  | 'operations-monitoring'
  | 'operations-intervention';

type GeoRecommendationSeverity = 'high' | 'medium' | 'low';
type GeoRecommendationConfidence = 'high' | 'medium' | 'low';

export type GeoHeatmapZone = {
  id: (string);
  name: (string);
  severity: 'danger' | 'warning' | 'best' | string;
  confidence: string;
  demandOrders: number;
  activeCaptains: number;
  storePressure: string;
  slaRisk: string;
  supplyDemandGap: number;
  delayedPickups: number;
  filterKey: string;
  recommendedAction: string;
  expectedImpact: string;
};

export type GeoSubTabId = 'orders' | 'captains' | 'stores' | 'sla' | 'peak';
export const GEO_FILTER_IDS = [
  'now',
  '15m',
  '30m',
  'high-risk',
  'captain-shortage',
  'store-pressure',
] as const;

export type GeoFilterId = (typeof GEO_FILTER_IDS)[number];

const GEO_FILTER_ID_SET: ReadonlySet<string> = new Set(GEO_FILTER_IDS);

export function isGeoFilterId(value: string): value is GeoFilterId {
  return GEO_FILTER_ID_SET.has(value);
}

const SUB_TAB_META: Record<GeoSubTabId, { affectedSurface: DshSurfaceId; lifecycleStep: GeoLifecycleStep }> = {
  orders: { affectedSurface: 'app-client', lifecycleStep: 'tracking' },
  captains: { affectedSurface: 'app-captain', lifecycleStep: 'delivery' },
  stores: { affectedSurface: 'app-partner', lifecycleStep: 'partner-preparation' },
  sla: { affectedSurface: 'control-panel', lifecycleStep: 'operations-monitoring' },
  peak: { affectedSurface: 'control-panel', lifecycleStep: 'operations-intervention' },
};

export function resolveLifecycleStep(subTabId: GeoSubTabId): GeoLifecycleStep {
  return SUB_TAB_META[subTabId]?.lifecycleStep ?? 'operations-monitoring';
}

export function resolveAffectedSurface(subTabId: GeoSubTabId): DshSurfaceId {
  return SUB_TAB_META[subTabId]?.affectedSurface ?? 'control-panel';
}

export function resolveSeverity(zone: GeoHeatmapZone): GeoRecommendationSeverity {
  if (zone.severity === 'danger') return 'high';
  if (zone.severity === 'warning') return 'medium';
  return 'low';
}

export function resolveConfidence(zone: GeoHeatmapZone): GeoRecommendationConfidence {
  if (zone.confidence === 'عالية') return 'high';
  if (zone.confidence === 'متوسطة') return 'medium';
  return 'low';
}

export function resolveStatusTone(zone: GeoHeatmapZone): 'danger' | 'warning' | 'success' {
  if (zone.severity === 'danger') return 'danger';
  if (zone.severity === 'warning') return 'warning';
  return 'success';
}

export function resolveRiskLabel(zone: GeoHeatmapZone): string {
  if (zone.severity === 'danger') return 'خطر عالٍ';
  if (zone.severity === 'warning') return 'خطر متوسط';
  return 'مستقر';
}

export function resolveStatusLabel(zone: GeoHeatmapZone, subTabId: GeoSubTabId): string {
  if (subTabId === 'orders') return `طلبات ${zone.demandOrders}`;
  if (subTabId === 'captains') return `كباتن ${zone.activeCaptains}`;
  if (subTabId === 'stores') return `ضغط ${zone.storePressure}`;
  if (subTabId === 'sla') return `التزام ${zone.slaRisk}`;
  return `فجوة ${zone.supplyDemandGap}`;
}

export function resolveRouteHint(hubHref: string, zoneId: string): string {
  return `${hubHref}?workspace=geo-heatmap&zoneId=${zoneId}`;
}

export function resolveMapPinLabel(zone: GeoHeatmapZone, subTabId: GeoSubTabId): string {
  if (subTabId === 'orders') return `${zone.demandOrders} طلب`;
  if (subTabId === 'captains') return `${zone.activeCaptains} كابتن`;
  if (subTabId === 'stores') return `ضغط ${zone.storePressure}`;
  if (subTabId === 'sla') return `التزام ${zone.slaRisk}`;
  return `فجوة ${zone.supplyDemandGap > 0 ? '+' : ''}${zone.supplyDemandGap}`;
}

export function matchesSubTab(zone: GeoHeatmapZone, subTabId: GeoSubTabId): boolean {
  if (subTabId === 'orders') return zone.filterKey === 'orders' || zone.demandOrders >= 18;
  if (subTabId === 'captains') return zone.filterKey === 'captains' || zone.activeCaptains >= 5;
  if (subTabId === 'stores') return zone.filterKey === 'stores' || zone.storePressure !== 'منخفض';
  if (subTabId === 'sla') return zone.slaRisk !== 'منخفض';
  return zone.filterKey === 'peak' || zone.supplyDemandGap > 0;
}

export function matchesFilter(zone: GeoHeatmapZone, filterId: GeoFilterId): boolean {
  if (filterId === 'now') return zone.demandOrders >= 12;
  if (filterId === '15m') return zone.demandOrders >= 18 || zone.delayedPickups > 0;
  if (filterId === '30m') return true;
  if (filterId === 'high-risk') return zone.severity === 'danger' || zone.slaRisk === 'حرج';
  if (filterId === 'captain-shortage') return zone.supplyDemandGap > 0;
  return zone.storePressure === 'مرتفع' || zone.storePressure === 'حرج';
}

export function buildRecommendation(zone: GeoHeatmapZone, subTabId: GeoSubTabId, hubHref: string) {
  return {
    id: `geo-${zone.id}-${subTabId}`,
    surface: 'control-panel',
    sourceSurface: 'control-panel',
    affectedSurface: resolveAffectedSurface(subTabId),
    actor: 'operator',
    lifecycleStep: resolveLifecycleStep(subTabId),
    entityId: zone.id,
    entityLabel: zone.name,
    status: resolveStatusLabel(zone, subTabId),
    risk: resolveRiskLabel(zone),
    severity: resolveSeverity(zone),
    confidence: resolveConfidence(zone),
    affectedEntity: zone.name,
    reason: `الطلبات ${zone.demandOrders} مقابل كباتن نشطين ${zone.activeCaptains} وفجوة ${zone.supplyDemandGap}`,
    evidence: `التقاطات متأخرة ${zone.delayedPickups} · الالتزام ${zone.slaRisk} · ضغط المتاجر ${zone.storePressure}`,
    nextAction: zone.recommendedAction,
    owner: 'مركز العمليات',
    expectedImpact: zone.expectedImpact,
    primaryActionLabel: 'تثبيت الإجراء',
    secondaryActionLabel: 'عرض الدليل',
    counterpartRouteHint: resolveRouteHint(hubHref, zone.id),
    runtimeBindingStatus: 'NEEDS_RUNTIME_EVIDENCE' as const,
  };
}

export type DshRuntimeBindingStatus =
  | 'UI_PREVIEW_ONLY'
  | 'NEEDS_BINDING_LATER'
  | 'API_CLIENT_BOUND__RUNTIME_EVIDENCE_PRESENT'
  | 'NEEDS_RUNTIME_EVIDENCE'
  | 'BLOCKED'
  | 'BLOCKED_BY_CONTRACT'
  | 'BLOCKED_BY_WLT';

export function translateDshRuntimeBindingStatus(status: DshRuntimeBindingStatus): string {
  switch (status) {
    case 'UI_PREVIEW_ONLY':
      return 'ربط قيد التنفيذ';
    case 'NEEDS_BINDING_LATER':
      return 'يحتاج ربطًا لاحقًا';
    case 'API_CLIENT_BOUND__RUNTIME_EVIDENCE_PRESENT':
      return 'عميل API مربوط مع دليل تشغيل';
    case 'NEEDS_RUNTIME_EVIDENCE':
      return 'يحتاج دليل تشغيل';
    case 'BLOCKED':
      return 'محجوب';
    case 'BLOCKED_BY_CONTRACT':
      return 'محجوب بسبب العقد';
    case 'BLOCKED_BY_WLT':
      return 'محجوب بسبب WLT';
    default:
      return status;
  }
}
