// app-field — DshFieldRouteRenderer
// Routes renderer that maps the current route state to the correct screen component.
import React from 'react';
import { DshFieldOnboardingScreen } from '../onboarding/DshFieldOnboardingScreen';
import { DshFieldAssignmentOnboardingScreen } from '../onboarding/DshFieldAssignmentOnboardingScreen';
import { DshFieldVisitScreen } from '../escalation/DshFieldVisitScreen';
import { DshFieldReadinessChecklistScreen } from '../escalation/DshFieldReadinessChecklistScreen';
import { DshFieldEscalationScreen } from '../escalation/DshFieldEscalationScreen';
import { DshFieldWorkQueueScreen } from '../escalation/DshFieldWorkQueueScreen';
import { DshFieldPartnersScreen } from '../stores/DshFieldPartnersScreen';
import { DshFieldStoreVerificationScreen } from '../stores/DshFieldStoreVerificationScreen';
import { DshFieldPartnerProgressScreen } from '../stores/DshFieldPartnerProgressScreen';
import { DshFieldProfileHomeScreen } from '../account/DshFieldProfileHomeScreen';
import { DshFieldProfileScreen } from '../account/DshFieldProfileScreen';
import { DshFieldProfileCompletionScreen } from '../account/DshFieldProfileCompletionScreen';
import { WltFieldFinanceScreen } from '../finance/WltFieldFinanceScreen';
import { DshFieldCatalogOperationsScreen } from './DshFieldCatalogOperationsScreen';
import type { useDshFieldSurfaceModel } from '../field.surface-model';
import type { DshFieldNavigation } from '../dsh-field.routes';
import type { FieldOnboardingController } from '../../shared/field-onboarding';
import type { useIdentitySession } from '@bthwani/core-identity';

type FieldSurfaceBinding = ReturnType<typeof useDshFieldSurfaceModel>;

type Props = {
  readonly model: FieldSurfaceBinding['model'];
  readonly navigation: DshFieldNavigation;
  readonly onboardingController: FieldOnboardingController;
  readonly identity: ReturnType<typeof useIdentitySession>;
  readonly onOpenAssignment: (assignmentId: string) => void;
};

export function DshFieldRouteRenderer({ model, navigation, onboardingController, identity, onOpenAssignment }: Props): React.ReactElement {
  const { route } = model;

  if (route.kind === 'onboarding') {
    const openProducts = (partnerId: string) => navigation.navigate({ kind: 'products-upload', partnerId });
    if (route.assignmentId) {
      return (
        <DshFieldAssignmentOnboardingScreen
          assignmentId={route.assignmentId}
          controller={onboardingController}
          onBack={navigation.back}
          onOpenProducts={openProducts}
        />
      );
    }
    return (
      <DshFieldOnboardingScreen
        controller={onboardingController}
        {...(route.partnerId ? { partnerId: route.partnerId } : {})}
        onBack={navigation.back}
        onOpenProducts={openProducts}
      />
    );
  }

  if (route.kind === 'visit') {
    return (
      <DshFieldVisitScreen
        storeId={route.storeId}
        onBack={navigation.back}
        onGoToChecklist={(visitId: string) =>
          navigation.navigate({
            kind: 'checklist',
            visitId,
            storeId: route.storeId,
          })
        }
        onGoToVerification={(visitId: string) =>
          navigation.navigate({
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
        onBack={navigation.back}
      />
    );
  }

  if (route.kind === 'partner-progress') {
    return (
      <DshFieldPartnerProgressScreen
        partnerId={route.partnerId}
        onBack={navigation.back}
        onOpenProducts={(partnerId) => navigation.navigate({ kind: 'products-upload', partnerId })}
        onOpenVisit={(storeId) => navigation.navigate({ kind: 'visit', storeId })}
        onOpenEscalation={(storeId) => navigation.navigate({ kind: 'escalation', storeId })}
      />
    );
  }

  if (route.kind === 'checklist') {
    return (
      <DshFieldReadinessChecklistScreen
        storeId={route.storeId}
        visitId={route.visitId}
        onBack={navigation.back}
      />
    );
  }

  if (route.kind === 'account') {
    const handleLogout = async () => {
      await identity.logout();
      onboardingController.reset();
      navigation.navigate({ kind: 'stores' }, 'replace');
    };
    return (
      <DshFieldProfileHomeScreen
        onBack={navigation.back}
        onOpenProfile={() => navigation.navigate({ kind: 'profile' })}
        onOpenProfileCompletion={() => navigation.navigate({ kind: 'profile-completion' })}
        onOpenFinance={() => navigation.navigate({ kind: 'finance' })}
        onOpenVerification={() => navigation.navigate({ kind: 'work-queue' })}
        onLogout={() => void handleLogout()}
      />
    );
  }

  if (route.kind === 'profile') {
    return <DshFieldProfileScreen onBack={navigation.back} />;
  }

  if (route.kind === 'profile-completion') {
    const handleLogout = async () => {
      await identity.logout();
      onboardingController.reset();
      navigation.navigate({ kind: 'stores' }, 'replace');
    };
    return (
      <DshFieldProfileCompletionScreen
        onBack={navigation.back}
        onLogout={() => void handleLogout()}
      />
    );
  }

  if (route.kind === 'finance') {
    return <WltFieldFinanceScreen onBack={navigation.back} />;
  }

  if (route.kind === 'escalation') {
    return (
      <DshFieldEscalationScreen
        storeId={route.storeId}
        {...(route.visitId ? { visitId: route.visitId } : {})}
        onBack={navigation.back}
      />
    );
  }

  if (route.kind === 'work-queue') {
    return (
      <DshFieldWorkQueueScreen
        onOpenVisit={(storeId) => navigation.navigate({ kind: 'visit', storeId })}
        onOpenEscalation={(storeId, visitId) =>
          navigation.navigate({ kind: 'escalation', storeId, ...(visitId ? { visitId } : {}) })
        }
        onOpenAssignment={(assignment) => onOpenAssignment(assignment.id)}
      />
    );
  }
  if (route.kind === 'products-upload') {
    return (
      <DshFieldCatalogOperationsScreen
        partnerId={route.partnerId}
        onBack={navigation.back}
      />
    );
  }

  return (
    <DshFieldPartnersScreen
      onOpenPartner={(partnerId, activationStatus) =>
        navigation.navigate(
          activationStatus === 'draft'
            ? { kind: 'onboarding', partnerId }
            : { kind: 'partner-progress', partnerId }
        )
      }
      onOpenAccount={() => navigation.navigate({ kind: 'account' })}
      onCreatePartner={() => navigation.navigate({ kind: 'onboarding' })}
      onOpenWorkQueue={() => navigation.navigate({ kind: 'work-queue' })}
      onOpenAssignment={(assignment) => onOpenAssignment(assignment.id)}
    />
  );
}
