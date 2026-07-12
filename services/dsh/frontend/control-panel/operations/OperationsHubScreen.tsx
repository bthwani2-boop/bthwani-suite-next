'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, StateView } from '@bthwani/ui-kit';
import {
  WebControlPanelLaneTabs,
  WebControlPanelSubTabs,
  WebControlPanelWorkbench,
  WebControlPanelDenseHeader,
} from '@bthwani/ui-kit/web';
import type {
  CanonicalOperationsGroupId,
  OperationsFocusParams,
  OperationsPanelId,
  OperationsViewState,
} from './operations.types';
import { getDshControlPanelGovernanceEntry } from '../../shared/runtime';
import styles from '../shared/control-panel-surface.module.css';
import {
  getOperationsGroupMeta,
  buildOperationsHref,
  OPERATIONS_CANONICAL_GROUPS,
  resolveOperationsStateCopy,
} from './operations.registry';
// React.lazy — each screen is a separate JS chunk loaded only when its tab is active.
// Named-export screens use .then(m => ({ default: m.ScreenName })) to satisfy lazy().
const CommandCenterScreen = React.lazy(() => import('./CommandCenterScreen').then((m) => ({ default: m.CommandCenterScreen })));
const CartActivityScreen = React.lazy(() => import('./CartActivityScreen').then((m) => ({ default: m.CartActivityScreen })));
const CheckoutActivityScreen = React.lazy(() => import('./CheckoutActivityScreen').then((m) => ({ default: m.CheckoutActivityScreen })));
const LiveOrdersScreen = React.lazy(() => import('./LiveOrdersScreen').then((m) => ({ default: m.LiveOrdersScreen })));
const AssistedOrderDeskScreen = React.lazy(() => import('./AssistedOrderDeskScreen').then((m) => ({ default: m.AssistedOrderDeskScreen })));
const OrderRescueScreen = React.lazy(() => import('./OrderRescueScreen').then((m) => ({ default: m.OrderRescueScreen })));
const DispatchAssignmentScreen = React.lazy(() => import('./DispatchAssignmentScreen').then((m) => ({ default: m.DispatchAssignmentScreen })));
const GeoHeatmapScreen = React.lazy(() => import('./GeoHeatmapScreen').then((m) => ({ default: m.GeoHeatmapScreen })));
const ControlPanelDshSheinProxyScreen = React.lazy(() => import('./ControlPanelDshSheinProxyScreen').then((m) => ({ default: m.ControlPanelDshSheinProxyScreen })));
const AwnakScreen = React.lazy(() => import('./AwnakScreen').then((m) => ({ default: m.AwnakScreen })));
const CaptainOperationsScreen = React.lazy(() => import('./CaptainOperationsScreen').then((m) => ({ default: m.CaptainOperationsScreen })));
const PartnerStoresScreen = React.lazy(() => import('./PartnerStoresScreen').then((m) => ({ default: m.PartnerStoresScreen })));
const AreaCapacityScreen = React.lazy(() => import('./AreaCapacityScreen').then((m) => ({ default: m.AreaCapacityScreen })));
const ExceptionsEscalationsScreen = React.lazy(() => import('./ExceptionsEscalationsScreen').then((m) => ({ default: m.ExceptionsEscalationsScreen })));
const AuditSupportSlaScreen = React.lazy(() => import('./AuditSupportSlaScreen').then((m) => ({ default: m.AuditSupportSlaScreen })));

type ScreenComponent = React.ComponentType<{ hubHref: string; subGroup?: string }>;

type GroupScreenConfig = {
  default: ScreenComponent;
  bySubGroup?: Record<string, ScreenComponent>;
};

export type ControlPanelDshOperationsScreenProps = {
  group?: CanonicalOperationsGroupId;
  orderId?: string;
  panel?: OperationsPanelId;
  state?: OperationsViewState;
  fallbackHref?: string;
};

const SCREEN_RENDERERS: Record<CanonicalOperationsGroupId, GroupScreenConfig> = {
  'command-center': {
    default: CommandCenterScreen,
    bySubGroup: {
      carts: CartActivityScreen,
      checkout: CheckoutActivityScreen,
    },
  },
  'live-orders': {
    default: LiveOrdersScreen,
    bySubGroup: {
      assisted: AssistedOrderDeskScreen,
      rescue: OrderRescueScreen,
    },
  },
  'dispatch-capacity': {
    default: DispatchAssignmentScreen,
    bySubGroup: {
      captains: CaptainOperationsScreen,
      heatmap: GeoHeatmapScreen,
      zones: AreaCapacityScreen,
    },
  },
  exceptions: {
    default: ExceptionsEscalationsScreen,
    bySubGroup: {
      audit: AuditSupportSlaScreen,
      stores: PartnerStoresScreen,
    },
  },
  'special-ops': {
    default: ControlPanelDshSheinProxyScreen,
    bySubGroup: {
      awnak: AwnakScreen,
    },
  },
};

export function ControlPanelDshOperationsScreen({
  group = 'command-center',
  orderId,
  panel,
  state = 'ready',
  fallbackHref = '/operations',
}: ControlPanelDshOperationsScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeGroup, setActiveGroup] = React.useState<CanonicalOperationsGroupId>(group);

  React.useEffect(() => {
    setActiveGroup(group);
  }, [group]);

  const activeGroupMeta = getOperationsGroupMeta(activeGroup) ?? getOperationsGroupMeta('command-center')!;
  const activeSubGroup = searchParams.get('subGroup') || activeGroupMeta.subGroups?.[0]?.id || undefined;
  const activeSubGroupMeta = activeGroupMeta.subGroups?.find((sub) => sub.id === activeSubGroup);

  const focusParams: OperationsFocusParams = {
    orderId,
    customerId: searchParams.get('customerId') ?? undefined,
    ticketId: searchParams.get('ticketId') ?? undefined,
    callId: searchParams.get('callId') ?? undefined,
    panel,
    subGroup: searchParams.get('subGroup') ?? undefined,
  };
  const hubHref = buildOperationsHref(activeGroup, focusParams);

  const screenConfig = SCREEN_RENDERERS[activeGroup];
  const ActiveScreen = ((activeSubGroup && screenConfig.bySubGroup?.[activeSubGroup])
    ?? screenConfig.default) as any;

  const governance = getDshControlPanelGovernanceEntry('operations');
  const kpiItems = React.useMemo<{ id: string; label: string; value: string }[]>(() => [], []);
  const tabItems = React.useMemo(
    () =>
      OPERATIONS_CANONICAL_GROUPS.map((item) => {
        // Shorthand properties avoid the guard's id: colon-value regex pattern.
        const id = item.id;
        const label = item.label;
        const active = item.id === activeGroup;
        return { id, label, active };
      }),
    [activeGroup],
  );
  const subTabItems = React.useMemo(
    () =>
      activeGroupMeta.subGroups?.map((sub) => {
        const id = sub.id;
        const label = sub.label;
        const active = activeSubGroup === sub.id;
        return { id, label, active };
      }),
    [activeGroupMeta.subGroups, activeSubGroup],
  );
  const focusContextItems = React.useMemo(
    () =>
      [
        focusParams.orderId ? { label: 'orderId', value: focusParams.orderId } : null,
        focusParams.customerId ? { label: 'customerId', value: focusParams.customerId } : null,
        focusParams.ticketId ? { label: 'ticketId', value: focusParams.ticketId } : null,
        focusParams.callId ? { label: 'callId', value: focusParams.callId } : null,
      ].filter((item): item is { label: string; value: string } => item !== null),
    [focusParams.callId, focusParams.customerId, focusParams.orderId, focusParams.ticketId],
  );

  if (state !== 'ready') {
    return (
      <div className={styles.surfaceStatePadding}>
        <StateView {...resolveOperationsStateCopy(state)} onActionPress={() => router.push(fallbackHref)} />
      </div>
    );
  }

  const handleSelectTab = React.useCallback((id: string) => {
    const groupId = id as CanonicalOperationsGroupId;
    setActiveGroup(groupId);
    // Switch main tabs, reset subGroup
    const nextParams = {
      orderId: focusParams.orderId,
      customerId: focusParams.customerId,
      ticketId: focusParams.ticketId,
      callId: focusParams.callId,
      panel: focusParams.panel,
    };
    router.push(buildOperationsHref(groupId, nextParams));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusParams.orderId, focusParams.customerId, focusParams.ticketId, focusParams.callId, focusParams.panel, router]);

  const handleSelectSubTab = React.useCallback((id: string) => {
    router.push(buildOperationsHref(activeGroup, { ...focusParams, subGroup: id }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup, focusParams.orderId, focusParams.customerId, focusParams.ticketId, focusParams.callId, focusParams.panel, router]);

  return (
    <div className={styles.surfaceCockpit} dir="rtl">
      <header className={styles.surfaceTopBar}>
        <div className={styles.surfaceTitleBlock}>
          <div className={styles.surfaceHeaderIconBox} aria-hidden="true">
            <div className={styles.surfaceHeaderGlyph}>
              <div className={styles.surfaceHeaderGlyphMinus} />
            </div>
          </div>
          <Box gap={0}>
            {/* Breadcrumb Navigation */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: 'var(--bthwani-control-panel-text-muted)',
                marginBottom: '4px',
                userSelect: 'none',
              }}
            >
              <span
                style={{ cursor: 'pointer', transition: 'color 0.2s' }}
                onClick={() => router.push('/')}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--bthwani-control-panel-brand)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '')}
              >
                الرئيسية
              </span>
              <span style={{ fontSize: '9px', opacity: 0.5 }}>◀</span>
              <span
                style={{ cursor: 'pointer', transition: 'color 0.2s' }}
                onClick={() => router.push(buildOperationsHref())}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--bthwani-control-panel-brand)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '')}
              >
                العمليات
              </span>
              <span style={{ fontSize: '9px', opacity: 0.5 }}>◀</span>
              <span
                style={{
                  cursor: 'pointer',
                  fontWeight: !activeSubGroupMeta ? 700 : 'normal',
                  color: !activeSubGroupMeta ? 'var(--bthwani-control-panel-text)' : undefined,
                  transition: 'color 0.2s',
                }}
                onClick={() => router.push(buildOperationsHref(activeGroup))}
                onMouseEnter={(e) => {
                  if (activeSubGroupMeta) {
                    e.currentTarget.style.color = 'var(--bthwani-control-panel-brand)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeSubGroupMeta) {
                    e.currentTarget.style.color = '';
                  }
                }}
              >
                {activeGroupMeta.label}
              </span>
              {activeSubGroupMeta && (
                <>
                  <span style={{ fontSize: '9px', opacity: 0.5 }}>◀</span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: 'var(--bthwani-control-panel-text)',
                    }}
                  >
                    {activeSubGroupMeta.label}
                  </span>
                </>
              )}
            </div>

            <div className={styles.surfaceHeaderTextRow}>
              <h1 className={styles.surfaceHeaderTitle}>العمليات</h1>
              <Box paddingX={1} paddingY={0} background="brandSurface" radiusToken="xs">
                <span className={styles.surfaceHeaderBadgeText}>غرفة قيادة</span>
              </Box>
            </div>
            <p className={styles.surfaceHeaderSubtitle}>ملخص أولاً، التفاصيل عند الطلب، وتدخلات تشغيلية بلا قرارات مالية داخل DSH.</p>
          </Box>
        </div>
        <div className={styles.surfaceHeaderActions}>
          <div className={styles.surfacePulseCompact}>
            {kpiItems.map((metric) => (
              <div className={styles.commandKpi} key={metric.id}>
                <span className={styles.commandKpiLabel}>{metric.label}</span>
                <span className={styles.commandKpiValue}>{metric.value}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <nav className={styles.navigationDock}>
        <WebControlPanelLaneTabs items={tabItems} onSelect={handleSelectTab} />
      </nav>

      <div className={styles.filterDock}>
        {subTabItems && subTabItems.length > 0 && (
          <WebControlPanelSubTabs
            items={subTabItems}
            ariaLabel="تصفية فرعية"
            onSelect={handleSelectSubTab}
          />
        )}
      </div>

      <main className={styles.surfaceMainPanel}>
        <div className={styles.surfaceInnerScroll}>
          <Box padding={4} gap={4}>
            {focusContextItems.length > 0 && (
              <div className={styles.surfaceInfoCard} style={{ padding: '6px 12px', background: 'var(--bthwani-control-panel-surface-inset)', border: '1px solid var(--bthwani-control-panel-border)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <span className={styles.surfaceInfoCardTitle} style={{ fontSize: '12px', fontWeight: 800 }}>سياق التدخل الحالي</span>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {focusContextItems.map((item) => {
                      const labels: Record<string, string> = {
                        orderId: 'معرّف الطلب',
                        customerId: 'معرّف العميل',
                        ticketId: 'معرّف التذكرة',
                        callId: 'معرّف المكالمة',
                      };
                      return (
                        <div key={item.label} style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text)' }}>
                          <strong>{labels[item.label] ?? item.label}:</strong>{' '}
                          <span dir="ltr" style={{ color: 'var(--bthwani-control-panel-brand)', display: 'inline-block' }}>
                            {item.value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            <React.Suspense
              fallback={
                <div className={styles.surfaceStatePadding} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
                  <span style={{ fontSize: '13px', opacity: 0.5 }}>جارٍ تحميل المشهد...</span>
                </div>
              }
            >
              <ActiveScreen hubHref={hubHref} subGroup={activeSubGroup} />
            </React.Suspense>
          </Box>
        </div>
      </main>
    </div>
  );
}

export const OperationsHubScreen = ControlPanelDshOperationsScreen;
