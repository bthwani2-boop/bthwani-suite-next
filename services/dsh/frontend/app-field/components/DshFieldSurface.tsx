// app-field — DshFieldSurface
// Consolidated entrypoint surface for field partner onboarding app.
import React from 'react';
import { BackHandler, Platform, View, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, colorRoles, StateView, TabBar, type TabBarItem } from '@bthwani/ui-kit';
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
} from '../../shared/field-readiness';

function useAndroidBackHandler(onBackPress: () => boolean) {
  React.useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [onBackPress]);
}

const FIELD_TAB_BAR_ITEMS: readonly TabBarItem[] = [
  { id: 'stores', label: 'الرئيسية', icon: 'home-outline', activeIcon: 'home' },
  { id: 'history', label: 'السجل', icon: 'time-outline', activeIcon: 'time' },
  { id: 'finance', label: 'المالية', icon: 'cash-outline', activeIcon: 'cash' },
  { id: 'profile', label: 'حسابي', icon: 'person-outline', activeIcon: 'person' },
];

export function DshFieldSurface({ command, onExit, installationId }: DshFieldSurfaceProps = {}) {
  const fieldSurface = useDshFieldSurfaceModel(command);
  const onboardingController = useFieldPartnerOnboardingController();
  const identity = useIdentitySession();
  const insets = useSafeAreaInsets();
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
  );

  useAndroidBackHandler(
    React.useCallback(() => {
      if (fieldSurface.model.routeStackDepth > 1) {
        fieldSurface.actions.popRoute();
        return true;
      }
      if (onExit) {
        onExit();
        return true;
      }
      return false;
    }, [fieldSurface.actions, fieldSurface.model.routeStackDepth, onExit]),
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
    const corrupt = offlineSync.state.message.includes('field offline queue is corrupt');
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase, justifyContent: 'center', padding: spacing[4] }}>
        <StatusBar backgroundColor={colorRoles.brandAction} barStyle="light-content" translucent={false} />
        <StateView
          tone="danger"
          title="تعذر ضمان مزامنة العمل الميداني"
          description={offlineSync.state.message}
          actionLabel={corrupt ? 'حفظ النسخة التالفة واستعادة الطابور' : 'إعادة المحاولة'}
          onActionPress={corrupt ? offlineSync.recover : offlineSync.retry}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
      <StatusBar backgroundColor={colorRoles.brandAction} barStyle="light-content" translucent={false} />

      <View
        style={{
          flex: 1,
          paddingBottom: fieldSurface.model.bottomNav.visible ? 72 + insets.bottom : 0,
        }}
      >
        <DshFieldRouteRenderer
          model={fieldSurface.model}
          actions={fieldSurface.actions}
          onboardingController={onboardingController}
          identity={identity}
        />
      </View>

      {fieldSurface.model.bottomNav.visible && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000 }}>
          <TabBar
            items={FIELD_TAB_BAR_ITEMS}
            activeId={fieldSurface.model.bottomNav.activeId}
            bottomInset={insets.bottom}
            centerAction={{
              icon: 'add',
              label: 'إضافة شريك',
              accessibilityLabel: 'إضافة شريك جديد',
              onPress: () => fieldSurface.actions.pushRoute({ kind: 'onboarding' }),
            }}
            onSelect={(id: string) => {
              if (id === 'stores') fieldSurface.actions.resetToStores();
              if (id === 'history') fieldSurface.actions.pushRoute({ kind: 'history' });
              if (id === 'finance') fieldSurface.actions.pushRoute({ kind: 'finance' });
              if (id === 'profile') fieldSurface.actions.pushRoute({ kind: 'account' });
            }}
          />
        </View>
      )}
    </View>
  );
}
