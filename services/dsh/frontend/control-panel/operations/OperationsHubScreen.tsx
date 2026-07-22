'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, StateView, Text } from '@bthwani/ui-kit';
import {
  WebControlPanelLaneTabs,
  WebControlPanelSubTabs,
} from '@bthwani/ui-kit/web';
import type {
  CanonicalOperationsGroupId,
  OperationsFocusParams,
  OperationsPanelId,
  OperationsViewState,
} from './operations.types';
import { DSH_NAV_ITEMS } from '@bthwani/control-panel/shell';
import styles from '../shared/control-panel-surface.module.css';
import {
  buildOperationsHref,
  resolveOperationsStateCopy,
  useOperationsController,
  useOperationsPermission,
} from '../../shared/operations';
import { useControlPanelSession } from '../../shared/session/control-panel-session';

const CommandCenterScreen = React.lazy(() =>
  import('./CommandCenterScreen').then((module) => ({ default: module.CommandCenterScreen })),
);
const CartActivityScreen = React.lazy(() =>
  import('./CartActivityScreen').then((module) => ({ default: module.CartActivityScreen })),
);
const CheckoutActivityScreen = React.lazy(() =>
  import('./CheckoutActivityScreen').then((module) => ({ default: module.CheckoutActivityScreen })),
);
const LiveOrdersScreen = React.lazy(() =>
  import('./LiveOrdersScreen').then((module) => ({ default: module.LiveOrdersScreen })),
);
const PickupWorkbenchScreen = React.lazy(() =>
  import('./PickupWorkbenchScreen').then((module) => ({ default: module.PickupWorkbenchScreen })),
);
const DeliveryProofReviewScreen = React.lazy(() =>
  import('./DeliveryProofReviewScreen').then((module) => ({ default: module.DeliveryProofReviewScreen })),
);
const DispatchAssignmentScreen = React.lazy(() =>
  import('./DispatchAssignmentScreen').then((module) => ({ default: module.DispatchAssignmentScreen })),
);
const SpecialOpsWorkbenchScreen = React.lazy(() =>
  import('./SpecialOpsWorkbenchScreen').then((module) => ({ default: module.SpecialOpsWorkbenchScreen })),
);
const PartnerStoresScreen = React.lazy(() =>
  import('./PartnerStoresScreen').then((module) => ({ default: module.PartnerStoresScreen })),
);
const AreaCapacityScreen = React.lazy(() =>
  import('./AreaCapacityScreen').then((module) => ({ default: module.AreaCapacityScreen })),
);
const ExceptionsEscalationsScreen = React.lazy(() =>
  import('./ExceptionsEscalationsScreen').then((module) => ({ default: module.ExceptionsEscalationsScreen })),
);

type ScreenProps = {
  hubHref: string;
  subGroup?: string;
  focusParams?: OperationsFocusParams;
};
type ScreenComponent = React.ComponentType<ScreenProps>;
type LazyScreenComponent = React.LazyExoticComponent<ScreenComponent>;
type GroupScreenConfig = {
  default: ScreenComponent | LazyScreenComponent;
  bySubGroup?: Readonly<Record<string, ScreenComponent | LazyScreenComponent>>;
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

/**
 * Only production-bound workspaces are mounted here. Experimental source files
 * remain available for later reuse, but cannot be reached through query-string
 * manipulation or bundled as live Operations surfaces.
 */
const SCREEN_RENDERERS: Readonly<Record<CanonicalOperationsGroupId, GroupScreenConfig>> = {
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
      partner_delivery: LiveOrdersScreen,
      pickup: PickupWorkbenchScreen,
      proofs: DeliveryProofReviewScreen,
    },
  },
  'dispatch-capacity': {
    default: DispatchAssignmentScreen,
    bySubGroup: {
      pending: DispatchAssignmentScreen,
      captains: DispatchAssignmentScreen,
      zones: AreaCapacityScreen,
    },
  },
  exceptions: {
    default: ExceptionsEscalationsScreen,
    bySubGroup: {
      active: ExceptionsEscalationsScreen,
      stores: PartnerStoresScreen,
    },
  },
  'special-ops': {
    default: SpecialOpsWorkbenchScreen,
    bySubGroup: {
      shein: SpecialOpsWorkbenchScreen,
      awnak: SpecialOpsWorkbenchScreen,
    },
  },
};

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

  const { state: sessionState } = useControlPanelSession();
  const hasPermission = useOperationsPermission(activeGroup, activeSubGroup);
  const screenConfig = SCREEN_RENDERERS[activeGroup];
  const ActiveScreen = ((activeSubGroup && screenConfig.bySubGroup?.[activeSubGroup])
    ?? screenConfig.default) as ScreenComponent;

  if (state !== 'ready') {
    return (
      <div className={styles.surfaceStatePadding}>
        <StateView
          {...resolveOperationsStateCopy(state)}
          onActionPress={() => router.push(fallbackHref)}
        />
      </div>
    );
  }

  if (sessionState.kind === 'restoring' || sessionState.kind === 'authenticating') {
    return (
      <div className={styles.surfaceStatePadding}>
        <StateView
          stateId="loading"
          title="جاري التحقق من جلسة لوحة التحكم"
          description="يتم استعادة هوية المشغّل وصلاحياته من خدمة الهوية."
        />
      </div>
    );
  }

  if (sessionState.kind !== 'authenticated') {
    return (
      <div className={styles.surfaceStatePadding}>
        <StateView
          stateId="recoverableError"
          title="الجلسة غير متاحة"
          description="سجّل الدخول بحساب لوحة التحكم للوصول إلى العمليات."
          actionLabel="العودة"
          onActionPress={() => router.push(fallbackHref)}
        />
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className={styles.surfaceStatePadding}>
        <StateView
          stateId="recoverableError"
          title="لا تملك صلاحية هذه المساحة"
          description={`تحتاج صلاحية قراءة متوافقة مع مجموعة ${activeGroupMeta.label}.`}
          actionLabel="العودة إلى مركز القيادة"
          onActionPress={() => router.push('/dsh/operations')}
        />
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
          <Box gap={1}>
            <div className={styles.surfaceBreadcrumb}>
              <button
                type="button"
                className={styles.surfaceBreadcrumbButton}
                onClick={() => router.push(getDshRoute('dashboard'))}
              >
                الرئيسية
              </button>
              <span className={styles.surfaceBreadcrumbSeparator}>/</span>
              <button
                type="button"
                className={styles.surfaceBreadcrumbButton}
                onClick={() => router.push(getDshRoute('operations'))}
              >
                العمليات
              </button>
              <span className={styles.surfaceBreadcrumbSeparator}>/</span>
              <button
                type="button"
                className={activeSubGroupMeta
                  ? styles.surfaceBreadcrumbButton
                  : styles.surfaceBreadcrumbCurrent}
                onClick={() => router.push(buildOperationsHref(activeGroup))}
              >
                {activeGroupMeta.label}
              </button>
              {activeSubGroupMeta ? (
                <>
                  <span className={styles.surfaceBreadcrumbSeparator}>/</span>
                  <span className={styles.surfaceBreadcrumbLeaf}>
                    {activeSubGroupMeta.label}
                  </span>
                </>
              ) : null}
            </div>

            <div className={styles.surfaceHeaderTextRow}>
              <h1 className={styles.surfaceHeaderTitle}>إدارة العمليات</h1>
              <Box paddingX={2} paddingY={1} background="brandSurface" radiusToken="sm">
                <Text role="caption">جلسة مشغّل موثقة</Text>
              </Box>
            </div>
            <p className={styles.surfaceHeaderSubtitle}>
              بيانات تشغيلية حية وتدخلات محكومة دون امتلاك قرارات WLT المالية.
            </p>
          </Box>
        </div>
      </header>

      <nav className={styles.navigationDock} aria-label="مجموعات العمليات">
        <WebControlPanelLaneTabs items={tabItems} onSelect={handleSelectTab} />
      </nav>

      <div className={styles.filterDock}>
        {subTabItems.length > 0 ? (
          <WebControlPanelSubTabs
            items={subTabItems}
            ariaLabel="تصفية مجموعة العمليات"
            onSelect={handleSelectSubTab}
          />
        ) : null}
      </div>

      <main className={styles.surfaceMainPanel}>
        <div className={styles.surfaceInnerScroll}>
          <Box padding={4} gap={4}>
            {focusContextItems.length > 0 ? (
              <div className={styles.surfaceFocusContextCard}>
                <div className={styles.surfaceFocusContextRow}>
                  <span className={styles.surfaceFocusContextTitle}>سياق التدخل الحالي</span>
                  <div className={styles.surfaceFocusContextList}>
                    {focusContextItems.map((item) => (
                      <div key={item.label} className={styles.surfaceFocusContextItem}>
                        <strong>{item.label}:</strong>{' '}
                        <span dir="ltr" className={styles.surfaceFocusContextValue}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <React.Suspense
              fallback={
                <div className={styles.surfaceLoadingPanel}>
                  <span className={styles.surfaceLoadingText}>جارٍ تحميل مساحة العمليات...</span>
                </div>
              }
            >
              <ActiveScreen
                hubHref={hubHref}
                focusParams={focusParams}
                {...(activeSubGroup ? { subGroup: activeSubGroup } : {})}
              />
            </React.Suspense>
          </Box>
        </div>
      </main>
    </div>
  );
}

export const OperationsHubScreen = ControlPanelDshOperationsScreen;
