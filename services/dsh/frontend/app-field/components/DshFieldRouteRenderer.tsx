// app-field — DshFieldRouteRenderer
// Routes renderer that maps the current route state to the correct screen component.
import React from 'react';
import { DshFieldOnboardingScreen } from '../onboarding/DshFieldOnboardingScreen';
import { DshFieldVisitScreen } from '../escalation/DshFieldVisitScreen';
import { DshFieldReadinessChecklistScreen } from '../escalation/DshFieldReadinessChecklistScreen';
import { DshFieldEscalationScreen } from '../escalation/DshFieldEscalationScreen';
import { DshFieldWorkQueueScreen } from '../escalation/DshFieldWorkQueueScreen';
import { DshFieldPartnersScreen } from '../stores/DshFieldPartnersScreen';
import { DshFieldStoreVerificationScreen } from '../stores/DshFieldStoreVerificationScreen';
import { DshFieldPartnerProgressScreen } from '../stores/DshFieldPartnerProgressScreen';
import { DshFieldProfileHomeScreen } from '../account/DshFieldProfileHomeScreen';
import { DshFieldProfileScreen } from '../account/DshFieldProfileScreen';
import { DshFieldStoresHistoryScreen } from '../stores/DshFieldStoresHistoryScreen';
import { DshFieldFinanceScreen } from '../finance/DshFieldFinanceScreen';
import { DshFieldCatalogOperationsScreen } from './DshFieldCatalogOperationsScreen';
import type { useDshFieldSurfaceModel } from '../field.surface-model';
import type { FieldOnboardingController } from '../../shared/field-onboarding';
import type { useIdentitySession } from '@bthwani/core-identity';

type FieldSurfaceBinding = ReturnType<typeof useDshFieldSurfaceModel>;

type Props = {
  readonly model: FieldSurfaceBinding['model'];
  readonly actions: FieldSurfaceBinding['actions'];
  readonly onboardingController: FieldOnboardingController;
  readonly identity: ReturnType<typeof useIdentitySession>;
};

export function DshFieldRouteRenderer({ model, actions, onboardingController, identity }: Props): React.ReactElement {
  const { route } = model;

  if (route.kind === 'onboarding') {
    return (
      <DshFieldOnboardingScreen
        controller={onboardingController}
        {...(route.partnerId ? { partnerId: route.partnerId } : {})}
        onBack={actions.popRoute}
        onOpenProducts={(partnerId) => actions.pushRoute({ kind: 'products-upload', partnerId })}
      />
    );
  }

  if (route.kind === 'visit') {
    return (
      <DshFieldVisitScreen
        storeId={route.storeId}
        onBack={actions.popRoute}
        onGoToChecklist={(visitId: string) =>
          actions.pushRoute({
            kind: 'checklist',
            visitId,
            storeId: route.storeId,
          })
        }
        onGoToVerification={(visitId: string) =>
          actions.pushRoute({
            kind: 'verification',
            visitId,
            storeId: route.storeId,
          })
        }
      />
    );
  }
  if (route.kind === 'verification') {
    return (
      <DshFieldStoreVerificationScreen
        storeId={route.storeId}
        visitId={route.visitId}
        onBack={actions.popRoute}
      />
    );
  }

  if (route.kind === 'partner-progress') {
    return (
      <DshFieldPartnerProgressScreen
        partnerId={route.partnerId}
        onBack={actions.popRoute}
        onOpenProducts={(partnerId) => actions.pushRoute({ kind: 'products-upload', partnerId })}
        onOpenVisit={(storeId) => actions.pushRoute({ kind: 'visit', storeId })}
        onOpenEscalation={(storeId) => actions.pushRoute({ kind: 'escalation', storeId })}
      />
    );
  }

  if (route.kind === 'checklist') {
    return (
      <DshFieldReadinessChecklistScreen
        storeId={route.storeId}
        visitId={route.visitId}
        onBack={actions.popRoute}
      />
    );
  }

  if (route.kind === 'account') {
    const handleLogout = async () => {
      await identity.logout();
      onboardingController.reset();
      actions.resetToStores();
    };
    return (
      <DshFieldProfileHomeScreen
        onBack={actions.popRoute}
        onOpenProfile={() => actions.pushRoute({ kind: 'profile' })}
        onOpenHistory={() => actions.pushRoute({ kind: 'history' })}
        onOpenFinance={() => actions.pushRoute({ kind: 'finance' })}
        onOpenVerification={() => actions.pushRoute({ kind: 'work-queue' })}
        onLogout={() => void handleLogout()}
      />
    );
  }

  if (route.kind === 'profile') {
    return <DshFieldProfileScreen onBack={actions.popRoute} />;
  }

  if (route.kind === 'history') {
    return <DshFieldStoresHistoryScreen onBack={actions.popRoute} />;
  }

  if (route.kind === 'finance') {
    return <DshFieldFinanceScreen onBack={actions.popRoute} />;
  }

  if (route.kind === 'escalation') {
    return (
      <DshFieldEscalationScreen
        storeId={route.storeId}
        {...(route.visitId ? { visitId: route.visitId } : {})}
        onBack={actions.popRoute}
      />
    );
  }

  if (route.kind === 'work-queue') {
    return (
      <DshFieldWorkQueueScreen
        onOpenVisit={(storeId) => actions.pushRoute({ kind: 'visit', storeId })}
        onOpenEscalation={(storeId, visitId) =>
          actions.pushRoute({ kind: 'escalation', storeId, ...(visitId ? { visitId } : {}) })
        }
      />
    );
  }
  if (route.kind === 'products-upload') {
    return (
      <DshFieldCatalogOperationsScreen
        partnerId={route.partnerId}
        onBack={actions.popRoute}
      />
    );
  }

  return (
    <DshFieldPartnersScreen
      onOpenPartner={(partnerId, activationStatus) =>
        actions.pushRoute(
          activationStatus === 'draft'
            ? { kind: 'onboarding', partnerId }
            : { kind: 'partner-progress', partnerId }
        )
      }
      onOpenAccount={() => actions.pushRoute({ kind: 'account' })}
      onCreatePartner={() => actions.pushRoute({ kind: 'onboarding' })}
      onOpenWorkQueue={() => actions.pushRoute({ kind: 'work-queue' })}
    />
  );
}
