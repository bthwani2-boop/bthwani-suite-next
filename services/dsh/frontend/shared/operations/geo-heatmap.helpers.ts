// Canonical location: dsh/frontend/shared/view-models/control-panel/operations/geo-heatmap.helpers.ts
// Authority: dsh/frontend/shared -- moved from control-panel/operations/geo-heatmap.helpers.ts
// Pure resolver helpers for GeoHeatmapScreen.
// All functions are stateless â€” no hooks, no imports from React.
// Extracted to keep GeoHeatmapScreen under 330 lines.

import type { DshSurfaceId } from '../runtime/dsh-flow-registry';

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
  if (zone.confidence === 'Ø¹Ø§Ù„ÙŠØ©') return 'high';
  if (zone.confidence === 'Ù…ØªÙˆØ³Ø·Ø©') return 'medium';
  return 'low';
}

export function resolveStatusTone(zone: GeoHeatmapZone): 'danger' | 'warning' | 'success' {
  if (zone.severity === 'danger') return 'danger';
  if (zone.severity === 'warning') return 'warning';
  return 'success';
}

export function resolveRiskLabel(zone: GeoHeatmapZone): string {
  if (zone.severity === 'danger') return 'Ø®Ø·Ø± Ø¹Ø§Ù„Ù';
  if (zone.severity === 'warning') return 'Ø®Ø·Ø± Ù…ØªÙˆØ³Ø·';
  return 'Ù…Ø³ØªÙ‚Ø±';
}

export function resolveStatusLabel(zone: GeoHeatmapZone, subTabId: GeoSubTabId): string {
  if (subTabId === 'orders') return `Ø·Ù„Ø¨Ø§Øª ${zone.demandOrders}`;
  if (subTabId === 'captains') return `ÙƒØ¨Ø§ØªÙ† ${zone.activeCaptains}`;
  if (subTabId === 'stores') return `Ø¶ØºØ· ${zone.storePressure}`;
  if (subTabId === 'sla') return `Ø§Ù„ØªØ²Ø§Ù… ${zone.slaRisk}`;
  return `ÙØ¬ÙˆØ© ${zone.supplyDemandGap}`;
}

export function resolveRouteHint(hubHref: string, zoneId: string): string {
  return `${hubHref}?workspace=geo-heatmap&zoneId=${zoneId}`;
}

export function resolveMapPinLabel(zone: GeoHeatmapZone, subTabId: GeoSubTabId): string {
  if (subTabId === 'orders') return `${zone.demandOrders} Ø·Ù„Ø¨`;
  if (subTabId === 'captains') return `${zone.activeCaptains} ÙƒØ§Ø¨ØªÙ†`;
  if (subTabId === 'stores') return `Ø¶ØºØ· ${zone.storePressure}`;
  if (subTabId === 'sla') return `Ø§Ù„ØªØ²Ø§Ù… ${zone.slaRisk}`;
  return `ÙØ¬ÙˆØ© ${zone.supplyDemandGap > 0 ? '+' : ''}${zone.supplyDemandGap}`;
}

export function matchesSubTab(zone: GeoHeatmapZone, subTabId: GeoSubTabId): boolean {
  if (subTabId === 'orders') return zone.filterKey === 'orders' || zone.demandOrders >= 18;
  if (subTabId === 'captains') return zone.filterKey === 'captains' || zone.activeCaptains >= 5;
  if (subTabId === 'stores') return zone.filterKey === 'stores' || zone.storePressure !== 'Ù…Ù†Ø®ÙØ¶';
  if (subTabId === 'sla') return zone.slaRisk !== 'Ù…Ù†Ø®ÙØ¶';
  return zone.filterKey === 'peak' || zone.supplyDemandGap > 0;
}

export function matchesFilter(zone: GeoHeatmapZone, filterId: GeoFilterId): boolean {
  if (filterId === 'now') return zone.demandOrders >= 12;
  if (filterId === '15m') return zone.demandOrders >= 18 || zone.delayedPickups > 0;
  if (filterId === '30m') return true;
  if (filterId === 'high-risk') return zone.severity === 'danger' || zone.slaRisk === 'Ø­Ø±Ø¬';
  if (filterId === 'captain-shortage') return zone.supplyDemandGap > 0;
  return zone.storePressure === 'Ù…Ø±ØªÙØ¹' || zone.storePressure === 'Ø­Ø±Ø¬';
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
    reason: `Ø§Ù„Ø·Ù„Ø¨Ø§Øª ${zone.demandOrders} Ù…Ù‚Ø§Ø¨Ù„ ÙƒØ¨Ø§ØªÙ† Ù†Ø´Ø·ÙŠÙ† ${zone.activeCaptains} ÙˆÙØ¬ÙˆØ© ${zone.supplyDemandGap}`,
    evidence: `Ø§Ù„ØªÙ‚Ø§Ø·Ø§Øª Ù…ØªØ£Ø®Ø±Ø© ${zone.delayedPickups} Â· Ø§Ù„Ø§Ù„ØªØ²Ø§Ù… ${zone.slaRisk} Â· Ø¶ØºØ· Ø§Ù„Ù…ØªØ§Ø¬Ø± ${zone.storePressure}`,
    nextAction: zone.recommendedAction,
    owner: 'Ù…Ø±ÙƒØ² Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª',
    expectedImpact: zone.expectedImpact,
    primaryActionLabel: 'ØªØ«Ø¨ÙŠØª Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡',
    secondaryActionLabel: 'Ø¹Ø±Ø¶ Ø§Ù„Ø¯Ù„ÙŠÙ„',
    counterpartRouteHint: resolveRouteHint(hubHref, zone.id),
    runtimeBindingStatus: 'NEEDS_RUNTIME_EVIDENCE' as const,
  };
}
