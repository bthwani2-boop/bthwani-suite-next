// app-field — DshFieldRouteRenderer
// Routes renderer that maps the current route state to the correct screen component.
import React from 'react';
import { FieldPartnerOnboardingScreen } from './onboarding/FieldPartnerOnboardingScreen';
import { DshFieldVisitScreen } from './escalation/DshFieldVisitScreen';
import { DshFieldReadinessChecklistScreen } from './escalation/DshFieldReadinessChecklistScreen';
import { DshFieldEscalationScreen } from './escalation/DshFieldEscalationScreen';
import { DshFieldStoresScreen } from './stores/DshFieldStoresScreen';
import { FieldStoreVerificationScreen } from './stores/FieldStoreVerificationScreen';
import { DshFieldProfileHomeScreen } from './account/DshFieldProfileHomeScreen';
import { DshFieldProfileScreen } from './account/DshFieldProfileScreen';
import { DshFieldStoresHistoryScreen } from './stores/DshFieldStoresHistoryScreen';
import { DshFieldFinanceScreen } from './finance/DshFieldFinanceScreen';
import { DshFieldDocumentUploadScreen } from './onboarding/DshFieldDocumentUploadScreen';
import { DshFieldStoreProductsUploadScreen } from './stores/DshFieldStoreProductsUploadScreen';
import type { useDshFieldSurfaceModel } from './field.surface-model';
import type { DshPartnerDocumentType } from '../shared/partner';
import type { FieldOnboardingController } from '../shared/field-onboarding';

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
      <FieldPartnerOnboardingScreen
        controller={onboardingController}
        onBack={actions.popRoute}
        onUploadDocument={(kind: DshPartnerDocumentType) =>
          actions.pushRoute({
            kind: 'document-upload',
            storeId: onboardingController.state.partnerId ?? 'onboarding-draft',
            docKind: kind,
          })
        }
        onEscalate={() =>
          actions.pushRoute({
            kind: 'escalation',
            storeId: onboardingController.state.partnerId ?? 'onboarding-draft',
          })
        }
        onGoToProducts={() =>
          actions.pushRoute({
            kind: 'products-upload',
            storeId: onboardingController.state.partnerId ?? 'onboarding-draft',
          })
        }
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
    return <FieldStoreVerificationScreen />;
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

  if (route.kind === 'document-upload') {
    return (
      <DshFieldDocumentUploadScreen
        controller={onboardingController}
        partnerId={route.storeId}
        onBack={actions.popRoute}
        {...(route.docKind ? { docKind: route.docKind } : {})}
      />
    );
  }

  if (route.kind === 'products-upload') {
    return (
      <DshFieldStoreProductsUploadScreen
        storeId={route.storeId}
        onBack={actions.popRoute}
      />
    );
  }

  if (route.kind === 'escalation') {
    return (
      <DshFieldEscalationScreen
        storeId={route.storeId}
        {...(route.visitId ? { visitId: route.visitId } : {})}
      />
    );
  }

  return (
    <DshFieldStoresScreen
      onOpenStore={(storeId) => actions.pushRoute({ kind: 'verification', storeId })}
      onOpenAccount={() => actions.pushRoute({ kind: 'account' })}
      onCreateStore={() => actions.pushRoute({ kind: 'onboarding' })}
    />
  );
}
