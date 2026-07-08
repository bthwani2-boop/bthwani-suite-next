// app-field — DshFieldRouteRenderer
// Routes renderer that maps the current route state to the correct screen component.
import React from 'react';
import { DshFieldOnboardingScreen } from '../onboarding/DshFieldOnboardingScreen';
import { DshFieldVisitScreen } from '../escalation/DshFieldVisitScreen';
import { DshFieldReadinessChecklistScreen } from '../escalation/DshFieldReadinessChecklistScreen';
import { DshFieldEscalationScreen } from '../escalation/DshFieldEscalationScreen';
import { DshFieldPartnersScreen } from '../stores/DshFieldPartnersScreen';
import { DshFieldStoreVerificationScreen } from '../stores/DshFieldStoreVerificationScreen';
import { DshFieldPartnerProgressScreen } from '../stores/DshFieldPartnerProgressScreen';
import { DshFieldProfileHomeScreen } from '../account/DshFieldProfileHomeScreen';
import { DshFieldProfileScreen } from '../account/DshFieldProfileScreen';
import { DshFieldStoresHistoryScreen } from '../stores/DshFieldStoresHistoryScreen';
import { DshFieldFinanceScreen } from '../finance/DshFieldFinanceScreen';
import { DshFieldPartnerProductsScreen } from './DshFieldPartnerProductsScreen';
import type { useDshFieldSurfaceModel } from '../field.surface-model';
import type { FieldOnboardingController } from '../../shared/field-onboarding';

type FieldSurfaceBinding = ReturnType<typeof useDshFieldSurfaceModel>;

type Props = {
  readonly model: FieldSurfaceBinding['model'];
  readonly actions: FieldSurfaceBinding['actions'];
  readonly onboardingController: FieldOnboardingController;
};

export function DshFieldRouteRenderer({ model, actions, onboardingController }: Props): React.ReactElement {
  const { route } = model;

  if (route.kind === 'onboarding') {
    return (
      <DshFieldOnboardingScreen
        controller={onboardingController}
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
      />
    );
  }
  if (route.kind === 'verification') {
    return <DshFieldStoreVerificationScreen />;
  }

  if (route.kind === 'partner-progress') {
    return (
      <DshFieldPartnerProgressScreen
        partnerId={route.partnerId}
        onBack={actions.popRoute}
        onOpenProducts={(partnerId) => actions.pushRoute({ kind: 'products-upload', partnerId })}
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
    return (
      <DshFieldProfileHomeScreen
        onBack={actions.popRoute}
        onOpenProfile={() => actions.pushRoute({ kind: 'profile' })}
        onOpenHistory={() => actions.pushRoute({ kind: 'history' })}
        onOpenFinance={() => actions.pushRoute({ kind: 'finance' })}
        onOpenVerification={() => actions.pushRoute({ kind: 'verification' })}
        onLogout={actions.popRoute}
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
      />
    );
  }

  if (route.kind === 'products-upload') {
    return (
      <DshFieldPartnerProductsScreen
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
    />
  );
}
