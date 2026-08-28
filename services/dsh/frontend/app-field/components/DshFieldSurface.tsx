// app-field — DshFieldSurface
// Consolidated entrypoint surface for field partner onboarding app.
import React from 'react';
import { View, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, colorRoles, InlineNotice, StateView, TabBar, type TabBarItem } from '@bthwani/ui-kit';
import { DshFieldProblemState } from './DshFieldProblemNotice';
import { useDshFieldSurfaceModel } from '../field.surface-model';
import type { DshFieldSurfaceProps } from '../dsh-field.routes';
import { DshFieldRouteRenderer } from './DshFieldRouteRenderer';
import { useIdentitySession } from '@bthwani/core-identity';
import { useFieldPartnerOnboardingController } from '../../shared/field-onboarding';
import {
  useFieldOfflineSync,
  createFieldVisit,
  completeFieldVisit,
  upsertReadinessCheck,
  createReadinessEscalation,
  reconcileFieldMutation,
} from '../../shared/field-readiness';

const FIELD_TAB_BAR_ITEMS: readonly TabBarItem[] = [
  { id: 'stores', label: 'الرئيسية', icon: 'home-outline', activeIcon: 'home' },
  { id: 'work-queue', label: 'المهام', icon: 'list-outline', activeIcon: 'list' },
  { id: 'finance', label: 'محفظتي', icon: 'cash-outline', activeIcon: 'cash' },
  { id: 'profile', label: 'حسابي', icon: 'person-outline', activeIcon: 'person' },
];

export function DshFieldSurface({ route, navigation, installationId }: DshFieldSurfaceProps) {
  const fieldSurface = useDshFieldSurfaceModel(route);
  const onboardingController = useFieldPartnerOnboardingController();
  const identity = useIdentitySession();
  const insets = useSafeAreaInsets();
  const openAssignment = React.useCallback((assignmentId: string) => {
    navigation.navigate({ kind: 'onboarding', assignmentId });
  }, [navigation]);
  const offlineScope = identity.state.kind === 'authenticated' && installationId
    ? {
        actorId: identity.state.identity.subject,
        installationId,
      }
    : undefined;

  const offlineSync = useFieldOfflineSync(
    identity.state.kind === 'authenticated'
      ? {
          create_visit: async (operation) => {
            const payload = operation.payload as {
              storeId: string;
              input: Parameters<typeof createFieldVisit>[1];
            };
            await createFieldVisit(payload.storeId, payload.input, {
              correlationId: operation.correlationId,
              idempotencyKey: operation.idempotencyKey,
            });
          },
          complete_visit: async (operation) => {
            const payload = operation.payload as {
              visitId: string;
              input: Parameters<typeof completeFieldVisit>[1];
            };
            await completeFieldVisit(payload.visitId, payload.input, {
              correlationId: operation.correlationId,
              idempotencyKey: operation.idempotencyKey,
            });
          },
          upsert_readiness_check: async (operation) => {
            const payload = operation.payload as {
              visitId: string;
              input: Parameters<typeof upsertReadinessCheck>[1];
            };
            await upsertReadinessCheck(payload.visitId, payload.input, {
              correlationId: operation.correlationId,
              idempotencyKey: operation.idempotencyKey,
            });
          },
          create_escalation: async (operation) => {
            const payload = operation.payload as {
              storeId: string;
              input: Parameters<typeof createReadinessEscalation>[1];
            };
            await createReadinessEscalation(payload.storeId, payload.input, {
              correlationId: operation.correlationId,
              idempotencyKey: operation.idempotencyKey,
            });
          },
        }
      : undefined,
    offlineScope,
    identity.state.kind === 'authenticated'
      ? {
          create_visit: (operation) => reconcileFieldMutation(operation.operationType, operation.idempotencyKey),
          complete_visit: (operation) => reconcileFieldMutation(operation.operationType, operation.idempotencyKey),
          upsert_readiness_check: (operation) => reconcileFieldMutation(operation.operationType, operation.idempotencyKey),
          create_escalation: (operation) => reconcileFieldMutation(operation.operationType, operation.idempotencyKey),
        }
      : undefined,
  );

  if (identity.state.kind !== 'authenticated') {
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase, justifyContent: 'center', padding: spacing[4] }}>
        <StatusBar backgroundColor={colorRoles.brandAction} barStyle="light-content" translucent={false} />
        <StateView
          tone="danger"
          title="جلسة الميداني غير متاحة"
          description="تدير بوابة الهوية العليا تسجيل الدخول والتفعيل. أعد فتح التطبيق أو سجّل الدخول مجددًا."
        />
      </View>
    );
  }

  if (offlineSync.state.kind === 'error') {
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase, justifyContent: 'center', padding: spacing[4] }}>
        <StatusBar backgroundColor={colorRoles.brandAction} barStyle="light-content" translucent={false} />
        <DshFieldProblemState
          problem={offlineSync.state.problem}
          handlers={{ recover_queue: offlineSync.recover }}
          onRetry={offlineSync.retry}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
      <StatusBar backgroundColor={colorRoles.brandAction} barStyle="light-content" translucent={false} />

      {/* Recovered terminal work cannot be replayed automatically under this
          session, so the employee must be told to redo it rather than assume
          it synced. */}
      {offlineSync.quarantinedCount > 0 && (
        <View style={{ padding: spacing[3] }}>
          <InlineNotice
            tone="warning"
            title="عمل ميداني يحتاج إعادة تنفيذ"
            description="تم حفظ عمل ميداني لم يُرسل بنجاح ولا يمكن إرساله تلقائيًا. أعد تنفيذ الزيارات أو الفحوصات المتأثرة."
            code="OFFLINE_WORK_RECOVERED"
          />
        </View>
      )}

      <View
        style={{
          flex: 1,
          paddingBottom: fieldSurface.model.bottomNav.visible ? 72 + insets.bottom : 0,
        }}
      >
        <DshFieldRouteRenderer
          model={fieldSurface.model}
          navigation={navigation}
          onboardingController={onboardingController}
          identity={identity}
          onOpenAssignment={openAssignment}
        />
      </View>

      {fieldSurface.model.bottomNav.visible && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000 }}>
          <TabBar
            items={FIELD_TAB_BAR_ITEMS}
            activeId={fieldSurface.model.bottomNav.activeId}
            bottomInset={insets.bottom}
            onSelect={(id: string) => {
              if (id === 'stores') navigation.navigate({ kind: 'stores' }, 'replace');
              if (id === 'work-queue') navigation.navigate({ kind: 'work-queue' });
              if (id === 'finance') navigation.navigate({ kind: 'finance' });
              if (id === 'profile') navigation.navigate({ kind: 'account' });
            }}
          />
        </View>
      )}
    </View>
  );
}
