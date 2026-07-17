'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, StateView } from '@bthwani/ui-kit';
import {
  WebControlPanelLaneTabs,
  WebControlPanelSubTabs,
} from '@bthwani/ui-kit/web';
import type { CanonicalOperationsGroupId, OperationsPanelId, OperationsViewState } from './operations.types';
import { DSH_NAV_ITEMS } from '@bthwani/control-panel/shell';
import styles from '../shared/control-panel-surface.module.css';
import {
  buildOperationsHref,
  resolveOperationsStateCopy,
  useOperationsController,
} from '../../shared/operations';
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
const PartnerStoresScreen = React.lazy(() => import('./PartnerStoresScreen').then((m) => ({ default: m.PartnerStoresScreen })));
const AreaCapacityScreen = React.lazy(() => import('./AreaCapacityScreen').then((m) => ({ default: m.AreaCapacityScreen })));
const ExceptionsEscalationsScreen = React.lazy(() => import('./ExceptionsEscalationsScreen').then((m) => ({ default: m.ExceptionsEscalationsScreen })));
const AuditSupportSlaScreen = React.lazy(() => import('./AuditSupportSlaScreen').then((m) => ({ default: m.AuditSupportSlaScreen })));
const PartnerDeliveryWorkbenchScreen = React.lazy(() => import('./PartnerDeliveryWorkbenchScreen').then((m) => ({ default: m.PartnerDeliveryWorkbenchScreen })));
const PickupWorkbenchScreen = React.lazy(() => import('./PickupWorkbenchScreen').then((m) => ({ default: m.PickupWorkbenchScreen })));

type ScreenProps = { hubHref: string; subGroup?: string; focusParams?: OperationsFocusParams };
type ScreenComponent = React.ComponentType<ScreenProps>;
type LazyScreenComponent = React.LazyExoticComponent<ScreenComponent>;

type GroupScreenConfig = {
  default: ScreenComponent | LazyScreenComponent;
  bySubGroup?: Record<string, ScreenComponent | LazyScreenComponent>;
};

function getDshRoute(section: (typeof DSH_NAV_ITEMS)[number]['section']) {
  return DSH_NAV_ITEMS.find((item) => item.section === section)?.route ?? '/dsh/dashboard';
}

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
      partner_delivery: PartnerDeliveryWorkbenchScreen,
      pickup: PickupWorkbenchScreen,
    },
  },
  'dispatch-capacity': {
    default: DispatchAssignmentScreen,
    bySubGroup: {
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
} satisfies Record<CanonicalOperationsGroupId, GroupScreenConfig>;

export function ControlPanelDshOperationsScreen({
  group = 'command-center',
  orderId,
  panel,
  state = 'ready',
  fallbackHref = '/dsh/operations',
}: ControlPanelDshOperationsScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    activeGroup,
    activeGroupMeta,
    activeSubGroup,
    activeSubGroupMeta,
    focusParams,
    hubHref,
    tabItems,
    subTabItems,
    focusContextItems,
    handleSelectTab,
    handleSelectSubTab,
  } = useOperationsController({
    group,
    orderId,
    panel,
    state,
    searchParams,
    router,
  });

  const screenConfig = SCREEN_RENDERERS[activeGroup] ?? SCREEN_RENDERERS['command-center'];
  const ActiveScreen = ((activeSubGroup && screenConfig.bySubGroup?.[activeSubGroup])
    ?? screenConfig.default) as ScreenComponent;

  if (state !== 'ready') {
    return (
      <div className={styles.surfaceStatePadding}>
        <StateView {...resolveOperationsStateCopy(state)} onActionPress={() => router.push(fallbackHref)} />
      </div>
    );
  }


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
            <div className={styles.surfaceBreadcrumb}>
              <button
                type="button"
                className={styles.surfaceBreadcrumbButton}
                onClick={() => router.push(getDshRoute('dashboard'))}
              >
                الرئيسية
              </button>
              <span className={styles.surfaceBreadcrumbSeparator}>◀</span>
              <button
                type="button"
                className={styles.surfaceBreadcrumbButton}
                onClick={() => router.push(getDshRoute('operations'))}
              >
                العمليات
              </button>
              <span className={styles.surfaceBreadcrumbSeparator}>◀</span>
              <button
                type="button"
                className={activeSubGroupMeta ? styles.surfaceBreadcrumbButton : styles.surfaceBreadcrumbCurrent}
                onClick={() => router.push(buildOperationsHref(activeGroup))}
              >
                {activeGroupMeta.label}
              </button>
              {activeSubGroupMeta && (
                <>
                  <span className={styles.surfaceBreadcrumbSeparator}>◀</span>
                  <span className={styles.surfaceBreadcrumbLeaf}>
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
              <div className={styles.surfaceFocusContextCard}>
                <div className={styles.surfaceFocusContextRow}>
                  <span className={styles.surfaceFocusContextTitle}>سياق التدخل الحالي</span>
                  <div className={styles.surfaceFocusContextList}>
                    {focusContextItems.map((item) => {
                      const labels: Record<string, string> = {
                        orderId: 'معرّف الطلب',
                        customerId: 'معرّف العميل',
                        ticketId: 'معرّف التذكرة',
                        callId: 'معرّف المكالمة',
                        requestId: 'معرّف الطلب الخاص',
                      };
                      return (
                        <div key={item.label} className={styles.surfaceFocusContextItem}>
                          <strong>{labels[item.label] ?? item.label}:</strong>{' '}
                          <span dir="ltr" className={styles.surfaceFocusContextValue}>
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
                <div className={styles.surfaceLoadingPanel}>
                  <span className={styles.surfaceLoadingText}>جارٍ تحميل المشهد...</span>
                </div>
              }
            >
              <ActiveScreen hubHref={hubHref} focusParams={focusParams} {...(activeSubGroup ? { subGroup: activeSubGroup } : {})} />
            </React.Suspense>
          </Box>
        </div>
      </main>
    </div>
  );
}

export const OperationsHubScreen = ControlPanelDshOperationsScreen;
