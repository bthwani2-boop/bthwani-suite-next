// app-partner — DshPartnerRouteRenderer
// Routes renderer that maps the current route state to the correct screen component.
import React from 'react';
import { PartnerActivationStatusScreen } from './onboarding/PartnerActivationStatusScreen';
import { PartnerStoreScreen } from './store/PartnerStoreScreen';
import { PartnerCatalogManagementScreen } from './catalog/PartnerCatalogManagementScreen';
import { PartnerOrdersScreen } from './orders/PartnerOrdersScreen';
import { PartnerSupportScreen } from './support/PartnerSupportScreen';
import { PartnerPerformanceScreen } from './analytics/PartnerPerformanceScreen';
import { PartnerSettlementScreen } from './analytics/PartnerSettlementScreen';
import { PartnerDocumentsScreen } from './onboarding/PartnerDocumentsScreen';
import { PartnerRequirementsScreen } from './onboarding/PartnerRequirementsScreen';
import type { useDshPartnerSurfaceModel } from './partner.surface-model';

type PartnerSurfaceBinding = ReturnType<typeof useDshPartnerSurfaceModel>;

type Props = {
  readonly model: PartnerSurfaceBinding['model'];
  readonly actions: PartnerSurfaceBinding['actions'];
};

export function DshPartnerRouteRenderer({ model, actions }: Props): React.ReactElement {
  const { route } = model;
  const DEV_STORE_ID = 'dev-store-001';

  if (route.kind === 'store') {
    return (
      <PartnerStoreScreen
        onOpenPerformance={() => actions.pushRoute({ kind: 'performance' })}
      />
    );
  }

  if (route.kind === 'catalog') {
    return <PartnerCatalogManagementScreen />;
  }

  if (route.kind === 'orders') {
    return (
      <PartnerOrdersScreen
        storeId={DEV_STORE_ID}
        onOpenSettlement={(orderId) =>
          actions.pushRoute({ kind: 'settlement', orderId })
        }
      />
    );
  }

  if (route.kind === 'support') {
    return <PartnerSupportScreen />;
  }

  if (route.kind === 'performance') {
    return <PartnerPerformanceScreen />;
  }

  if (route.kind === 'settlement') {
    return (
      <PartnerSettlementScreen
        orderId={route.orderId ?? null}
      />
    );
  }

  if (route.kind === 'documents') {
    return <PartnerDocumentsScreen />;
  }

  if (route.kind === 'requirements') {
    return <PartnerRequirementsScreen />;
  }

  // fallback to onboarding/status
  return <PartnerActivationStatusScreen />;
}
