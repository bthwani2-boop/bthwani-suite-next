'use client';

import React from 'react';
import { Box, Text } from '@bthwani/ui-kit';
import {
  WebControlPanelActionCluster,
  WebControlPanelCompactPager,
  WebControlPanelDenseHeader,
  WebControlPanelDecisionRow,
  WebControlPanelInspectorShell,
  WebControlPanelLaneTabs,
  WebControlPanelMapCanvas,
  WebControlPanelMapPin,
  WebControlPanelMiniMapZone,
  WebControlPanelQueue,
  WebControlPanelRecommendation,
  WebControlPanelRouteLine,
  WebControlPanelStatusTag,
  WebControlPanelTertiaryFilters,
  WebControlPanelWorkbench,
} from '@bthwani/ui-kit/web';
import { translateDshRuntimeBindingStatus } from '../../shared/runtime';
import type { GeoHeatmapZone } from './geo-heatmap.helpers';

const GEO_HEATMAP_ZONES: GeoHeatmapZone[] = [];
import styles from '../shared/control-panel-surface.module.css';
import {
  buildRecommendation,
  isGeoFilterId,
  matchesFilter,
  matchesSubTab,
  resolveMapPinLabel,
  resolveRouteHint,
  resolveStatusLabel,
  resolveStatusTone,
  type GeoFilterId,
  type GeoSubTabId,
} from './geo-heatmap.helpers';

const SUB_TABS = [
  { id: 'orders', label: 'الطلبات' },
  { id: 'captains', label: 'الكباتن' },
  { id: 'stores', label: 'المتاجر' },
  { id: 'sla', label: 'الالتزام' },
  { id: 'peak', label: 'الذروة' },
] as const;

const TERTIARY_FILTERS = [
  { id: 'now', label: 'الآن' },
  { id: '15m', label: '١٥ دقيقة' },
  { id: '30m', label: '٣٠ دقيقة' },
  { id: 'high-risk', label: 'خطر عالٍ' },
  { id: 'captain-shortage', label: 'نقص كباتن' },
  { id: 'store-pressure', label: 'ضغط متاجر' },
] as const satisfies ReadonlyArray<{ id: GeoFilterId; label: string }>;

const ZONE_LAYOUT: Record<string, {
  zone: { top: string; right: string; width: string; height: string };
  order: { top: string; right: string };
  captain: { top: string; right: string };
  store: { top: string; right: string };
  routePoints: string;
}> = {
  'N-01': {
    zone: { top: '7%', right: '8%', width: '28%', height: '28%' },
    order: { top: '18%', right: '18%' }, captain: { top: '31%', right: '33%' }, store: { top: '42%', right: '11%' },
    routePoints: '82,22 68,33 86,46',
  },
  'E-02': {
    zone: { top: '24%', right: '42%', width: '24%', height: '24%' },
    order: { top: '34%', right: '49%' }, captain: { top: '44%', right: '62%' }, store: { top: '55%', right: '45%' },
    routePoints: '54,36 40,46 58,58',
  },
  'C-03': {
    zone: { top: '42%', right: '22%', width: '20%', height: '20%' },
    order: { top: '49%', right: '29%' }, captain: { top: '58%', right: '38%' }, store: { top: '67%', right: '24%' },
    routePoints: '73,52 61,59 75,68',
  },
  'S-04': {
    zone: { top: '60%', right: '56%', width: '22%', height: '22%' },
    order: { top: '68%', right: '62%' }, captain: { top: '76%', right: '73%' }, store: { top: '84%', right: '58%' },
    routePoints: '41,70 28,77 43,86',
  },
};

export function GeoHeatmapScreen({ hubHref, subGroup }: { hubHref: string; subGroup?: string }) {
  const [activeSubTab, setActiveSubTab] = React.useState(subGroup ?? 'orders');
  const [activeFilter, setActiveFilter] = React.useState<GeoFilterId>('now');
  const [selectedZoneId, setSelectedZoneId] = React.useState(GEO_HEATMAP_ZONES[0]?.id ?? '');
  const [actionFeedback, setActionFeedback] = React.useState<string | null>(null);

  const handleApplyPlan = React.useCallback((zoneId: string, actionLabel: string) => {
    const zone = GEO_HEATMAP_ZONES.find((z) => z.id === zoneId);
    const zoneName = zone ? zone.name : zoneId;
    setActionFeedback(`تم تثبيت القرار التشغيلي للمنطقة [${zoneName}] بنجاح (الإجراء المطبق: ${actionLabel}). سيقوم النظام بتوجيه السعة لتغطية الطلبات المباشرة.`);
    setTimeout(() => setActionFeedback(null), 3500);
  }, []);

  const handleShowEvidence = React.useCallback((zoneId: string) => {
    const zone = GEO_HEATMAP_ZONES.find((z) => z.id === zoneId);
    if (zone) {
      setActionFeedback(`دليل المنطقة [${zone.name}]: التقاطات متأخرة ${zone.delayedPickups}، الالتزام بمستوى الخدمة ${zone.slaRisk}، ضغط المتاجر الشريكة ${zone.storePressure}.`);
    } else {
      setActionFeedback(`جاري عرض الدليل للتحقق من المنطقة ${zoneId}.`);
    }
    setTimeout(() => setActionFeedback(null), 3500);
  }, []);

  React.useEffect(() => {
    if (subGroup) setActiveSubTab(subGroup);
  }, [subGroup]);

  const candidateZones = React.useMemo(
    () => GEO_HEATMAP_ZONES.filter((zone) => matchesSubTab(zone, activeSubTab as GeoSubTabId)),
    [activeSubTab],
  );
  const filteredZones = React.useMemo(
    () => candidateZones.filter((zone) => matchesFilter(zone, activeFilter)),
    [candidateZones, activeFilter],
  );
  const visibleZones = React.useMemo(
    () => (filteredZones.length > 0 ? filteredZones : candidateZones).slice(0, 5),
    [filteredZones, candidateZones],
  );
  const selectedZone = visibleZones.find((zone) => zone.id === selectedZoneId) ?? visibleZones[0] ?? GEO_HEATMAP_ZONES[0];

  // Pre-compute all visible zone recommendations in a single useMemo pass.
  // This prevents buildRecommendation being called N+1 times per render.
  const zoneRecommendations = React.useMemo(
    () => Object.fromEntries(visibleZones.map((zone) => [zone.id, buildRecommendation(zone, activeSubTab as GeoSubTabId, hubHref)])),
    [visibleZones, activeSubTab, hubHref],
  );
  const selectedRecommendation = selectedZone ? zoneRecommendations[selectedZone.id] : undefined;

  React.useEffect(() => {
    if (selectedZone && selectedZone.id !== selectedZoneId) {
      setSelectedZoneId(selectedZone.id);
    }
  }, [selectedZone, selectedZoneId]);

  const selectedZoneLayout = selectedZone ? ZONE_LAYOUT[selectedZone.id] : undefined;

  return (
    <Box gap={3}>
      <Box gap={2} style={{ marginBottom: 4 }}>
        <Text role="bodySm" tone="muted">
          هذه معاينة خريطة تشغيلية خاصة بلوحة التحكم، تعرض إشارات الطلبات والكباتن والمتاجر ملخصةً أولاً دون أي ربط بخرائط خارجية أو تعديل ميداني.
        </Text>
        <WebControlPanelTertiaryFilters
          ariaLabel="مرشحات الخريطة"
          items={TERTIARY_FILTERS.map((filter) => ({
            id: filter.id,
            label: filter.label,
            active: filter.id === activeFilter,
          }))}
          onSelect={(nextFilterId: string) => {
            if (isGeoFilterId(nextFilterId)) {
              setActiveFilter(nextFilterId);
            }
          }}
        />
      </Box>

      <div className={styles.surfaceSplitGrid}>
        <Box gap={3}>
          <WebControlPanelMapCanvas
            legend={
              <div className={styles.surfaceActionWrap}>
                <WebControlPanelStatusTag label="الطلب والسعة" tone="info" />
                <WebControlPanelStatusTag label="مخاطر الالتزام" tone="warning" />
                <WebControlPanelStatusTag label="معاينة فقط" tone="neutral" />
              </div>
            }
          >
            {selectedZoneLayout ? (
              <WebControlPanelRouteLine
                points={selectedZoneLayout.routePoints}
                tone={selectedZone?.severity === 'danger' ? 'danger' : selectedZone?.severity === 'warning' ? 'warning' : 'success'}
              />
            ) : null}
            {visibleZones.map((zone) => {
              const layout = ZONE_LAYOUT[zone.id];
              if (!layout) return null;
              const isSelected = zone.id === selectedZoneId;
              return (
                <React.Fragment key={zone.id}>
                  <WebControlPanelMiniMapZone
                    label={zone.name}
                    tone={zone.severity === 'danger' ? 'danger' : zone.severity === 'warning' ? 'warning' : zone.severity === 'best' ? 'success' : 'neutral'}
                    width={layout.zone.width}
                    height={layout.zone.height}
                    position={{ top: layout.zone.top, right: layout.zone.right }}
                    onSelect={() => setSelectedZoneId(zone.id)}
                  />
                  {!isSelected && (
                    <WebControlPanelMapPin
                      label={resolveMapPinLabel(zone, activeSubTab as GeoSubTabId)}
                      tone={zone.severity === 'danger' ? 'danger' : zone.severity === 'warning' ? 'warning' : 'success'}
                      position={
                        activeSubTab === 'orders' ? layout.order
                          : activeSubTab === 'captains' ? layout.captain
                          : layout.store
                      }
                      onSelect={() => setSelectedZoneId(zone.id)}
                    />
                  )}
                  {isSelected && (
                    <>
                      <WebControlPanelMapPin label={`${zone.demandOrders} طلب`} tone="neutral" position={layout.order} onSelect={() => setSelectedZoneId(zone.id)} />
                      <WebControlPanelMapPin label={`${zone.activeCaptains} كابتن`} tone="success" position={layout.captain} onSelect={() => setSelectedZoneId(zone.id)} />
                      <WebControlPanelMapPin label={`ضغط ${zone.storePressure}`} tone="warning" position={layout.store} onSelect={() => setSelectedZoneId(zone.id)} />
                    </>
                  )}
                </React.Fragment>
              );
            })}
          </WebControlPanelMapCanvas>

          <WebControlPanelQueue
            title="مصفوفة المناطق"
            meta="حتى ٥ صفوف مرئية في هذا المشهد مع تثبيت المنطقة المختارة في المفتش."
            pager={
              <WebControlPanelCompactPager page={1} totalPages={1} summaryLabel="المشهد الحالي" />
            }
          >
            {visibleZones.map((zone) => {
              const recommendation = zoneRecommendations[zone.id];
              return (
                <WebControlPanelDecisionRow
                  key={zone.id}
                  entityId={zone.id}
                  entityLabel={`${zone.name} · الطلبات ${zone.demandOrders} · الكباتن ${zone.activeCaptains}`}
                  status={resolveStatusLabel(zone, activeSubTab as GeoSubTabId)}
                  statusTone={resolveStatusTone(zone)}
                  risk={zone.severity === 'danger' ? 'danger' : zone.severity === 'warning' ? 'warning' : 'neutral'}
                  recommendation={zone.recommendedAction}
                  reason={`فجوة السعة ${zone.supplyDemandGap} · التقاطات متأخرة ${zone.delayedPickups}`}
                  sla={`الالتزام ${zone.slaRisk} · ضغط المتاجر ${zone.storePressure} · ثقة ${zone.confidence}`}
                  primaryAction={{ id: `${zone.id}-select`, label: 'تثبيت المنطقة', onAction: () => setSelectedZoneId(zone.id) }}
                  secondaryAction={{
                    id: `${zone.id}-guide`,
                    label: recommendation.secondaryActionLabel,
                    onAction: () => {
                      setSelectedZoneId(zone.id);
                      handleShowEvidence(zone.id);
                    }
                  }}
                  onInspect={() => setSelectedZoneId(zone.id)}
                />
              );
            })}
          </WebControlPanelQueue>
        </Box>

        <Box gap={4}>
          <WebControlPanelInspectorShell
            title={selectedZone ? `تفاصيل ${selectedZone.name}` : 'تفاصيل المنطقة'}
            onClose={() => setSelectedZoneId(visibleZones[0]?.id ?? GEO_HEATMAP_ZONES[0]?.id ?? '')}
          >
            <Box gap={2}>
              {actionFeedback && (
                <div className={styles.overrideNotification} style={{ padding: '8px 12px', background: 'var(--bthwani-control-panel-surface-inset)', border: '1px solid var(--bthwani-control-panel-border)', borderRadius: '8px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                  {actionFeedback}
                </div>
              )}
              <Box gap={2}>
                {[
                  { label: 'نوع الكيان', value: 'منطقة تشغيلية' },
                  { label: 'الحالة الحالية', value: selectedRecommendation?.status ?? 'غير محدد' },
                  { label: 'الخطر', value: selectedRecommendation?.risk ?? 'مستقر' },
                  { label: 'حالة الربط', value: translateDshRuntimeBindingStatus(selectedRecommendation?.runtimeBindingStatus ?? 'NEEDS_RUNTIME_EVIDENCE') },
                  { label: 'الدليل', value: selectedRecommendation?.evidence ?? 'لا يوجد تحديد بعد' },
                  { label: 'الأثر المتوقع', value: selectedRecommendation?.expectedImpact ?? 'لا يوجد تقدير بعد' },
                ].map(({ label, value }) => (
                  <Box key={label} padding={2} border radiusToken="lg" background="surfaceRaised">
                    <Text role="caption" tone="muted">{label}</Text>
                    <Text role="bodySm">{value}</Text>
                  </Box>
                ))}
              </Box>

              <WebControlPanelRecommendation
                title="التوصية الحالية"
                reason={selectedRecommendation ? `${selectedRecommendation.reason} · ${selectedRecommendation.evidence}` : 'اختر منطقة لعرض التوصية.'}
                confidence={selectedRecommendation?.confidence ?? 'medium'}
                auditTag={translateDshRuntimeBindingStatus(selectedRecommendation?.runtimeBindingStatus ?? 'NEEDS_RUNTIME_EVIDENCE')}
                primaryAction={selectedRecommendation ? { id: `${selectedRecommendation.id}-primary`, label: selectedRecommendation.primaryActionLabel, onAction: () => handleApplyPlan(selectedZone.id, selectedRecommendation.nextAction) } : undefined}
                secondaryAction={selectedRecommendation ? { id: `${selectedRecommendation.id}-secondary`, label: selectedRecommendation.secondaryActionLabel, onAction: () => handleShowEvidence(selectedZone.id) } : undefined}
              />

              <WebControlPanelActionCluster
                primary={{ id: 'apply-plan', label: 'تثبيت القرار', onAction: () => handleApplyPlan(selectedZone.id, selectedZone.recommendedAction) }}
                secondary={{ id: 'show-evidence', label: 'عرض الدليل', onAction: () => handleShowEvidence(selectedZone.id) }}
              />

              <Box gap={1}>
                <WebControlPanelStatusTag label={`مخاطر الالتقاط ${selectedZone?.delayedPickups ?? 0}`} tone={(selectedZone?.delayedPickups ?? 0) > 0 ? 'danger' : 'success'} />
                <WebControlPanelStatusTag label={`الالتزام ${selectedZone?.slaRisk ?? 'منخفض'}`} tone={selectedZone?.slaRisk === 'حرج' ? 'danger' : selectedZone?.slaRisk === 'مرتفع' ? 'warning' : 'success'} />
                <WebControlPanelStatusTag label={`ضغط المتاجر ${selectedZone?.storePressure ?? 'منخفض'}`} tone={selectedZone?.storePressure === 'حرج' || selectedZone?.storePressure === 'مرتفع' ? 'warning' : 'success'} />
                <WebControlPanelStatusTag label={`فجوة السعة ${selectedZone?.supplyDemandGap ?? 0}`} tone={(selectedZone?.supplyDemandGap ?? 0) > 5 ? 'danger' : 'info'} />
                <WebControlPanelStatusTag label={`المرشح ${activeFilter}`} tone="info" />
              </Box>
            </Box>
          </WebControlPanelInspectorShell>
        </Box>
      </div>
    </Box>
  );
}

export default GeoHeatmapScreen;
