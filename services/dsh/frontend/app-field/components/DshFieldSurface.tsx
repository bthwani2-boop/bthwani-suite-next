// app-field — DshFieldSurface
// Consolidated entrypoint surface for field partner onboarding app.
import React from 'react';
import { BackHandler, Platform, Pressable, View, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, spacing, colorRoles, Icon, StateView } from '@bthwani/ui-kit';
import { useDshFieldSurfaceModel } from '../field.surface-model';
import type { DshFieldSurfaceProps } from '../dsh-field.routes';
import { DshFieldRouteRenderer } from './DshFieldRouteRenderer';
import { useIdentitySession } from '@bthwani/core-identity';
import { DshFieldActivationCard } from './DshFieldActivationCard';
import { useFieldPartnerOnboardingController } from '../../shared/field-onboarding';
import {
  useFieldOfflineSync,
  completeFieldVisit,
  upsertReadinessCheck,
} from '../../shared/field-readiness';

function useAndroidBackHandler(onBackPress: () => boolean) {
  React.useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [onBackPress]);
}

function FieldBottomNavBar({
  activeId,
  onSelect,
  onLauncherPress,
}: {
  activeId: string;
  onSelect: (id: string) => void;
  onLauncherPress: () => void;
}) {
  const insets = useSafeAreaInsets();
  const rightItems = [
    { id: 'tasks', label: 'المهام', icon: 'list-outline', activeIcon: 'list' },
    { id: 'history', label: 'السجل', icon: 'time-outline', activeIcon: 'time' },
  ];
  const leftItems = [
    { id: 'finance', label: 'المالية', icon: 'cash-outline', activeIcon: 'cash' },
    { id: 'profile', label: 'حسابي', icon: 'person-outline', activeIcon: 'person' },
  ];

  const NavItem = ({ id, label, icon, activeIcon }: typeof rightItems[0]) => {
    const isActive = activeId === id;
    return (
      <Pressable
        key={id}
        onPress={() => onSelect(id)}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[2] }}
      >
        <Icon
          name={isActive ? activeIcon : icon}
          size={22}
          tone={isActive ? 'brand' : 'muted'}
        />
        <Text
          style={{
            fontSize: 10,
            marginTop: 2,
            color: isActive ? colorRoles.brandAction : colorRoles.textMuted,
            fontWeight: isActive ? '700' : '400',
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        height: 72 + insets.bottom,
        paddingBottom: insets.bottom,
        backgroundColor: colorRoles.surfaceBase,
        borderTopWidth: 1,
        borderTopColor: colorRoles.borderSubtle,
        alignItems: 'center',
        shadowColor: colorRoles.brandStructure,
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 12,
      }}
    >
      {leftItems.map((item) => <NavItem key={item.id} {...item} />)}

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Pressable
          onPress={onLauncherPress}
          style={({ pressed }) => ({
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colorRoles.brandAction,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
            opacity: pressed ? 0.88 : 1,
            shadowColor: colorRoles.brandAction,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.45,
            shadowRadius: 10,
            elevation: 8,
          })}
          accessibilityLabel="إضافة ملف جديد"
        >
          <Icon name="add" size={30} color={colorRoles.surfaceBase} />
        </Pressable>
        <Text style={{ fontSize: 10, color: colorRoles.textMuted, marginTop: -18 }}>
          إضافة
        </Text>
      </View>

      {rightItems.map((item) => <NavItem key={item.id} {...item} />)}
    </View>
  );
}

export function DshFieldSurface({ command, onExit }: DshFieldSurfaceProps = {}) {
  const fieldSurface = useDshFieldSurfaceModel(command);
  const onboardingController = useFieldPartnerOnboardingController();
  const identity = useIdentitySession();
  const insets = useSafeAreaInsets();

  const offlineSync = useFieldOfflineSync(
    identity.state.kind === 'authenticated'
      ? {
          complete_visit: async (operation) => {
            const payload = operation.payload as {
              visitId: string;
              completionLocation: Parameters<typeof completeFieldVisit>[1];
            };
            await completeFieldVisit(payload.visitId, payload.completionLocation);
          },
          upsert_readiness_check: async (operation) => {
            const payload = operation.payload as {
              visitId: string;
              input: Parameters<typeof upsertReadinessCheck>[1];
            };
            await upsertReadinessCheck(payload.visitId, payload.input);
          },
        }
      : undefined,
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

  if (identity.state.kind === 'restoring' || identity.state.kind === 'unconfigured') {
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
        <StatusBar backgroundColor={colorRoles.brandAction} barStyle="light-content" translucent={false} />
      </View>
    );
  }

  if (identity.state.kind !== 'authenticated') {
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
        <StatusBar backgroundColor={colorRoles.brandAction} barStyle="light-content" translucent={false} />
        <View style={{ flex: 1, justifyContent: 'center', padding: spacing[4] }}>
          <DshFieldActivationCard
            loading={identity.state.kind === 'authenticating'}
            {...(identity.state.kind === 'error' ? { error: identity.state.message } : {})}
            onSubmit={(phone, code) => void identity.activate(phone, code)}
          />
        </View>
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
          <FieldBottomNavBar
            activeId={fieldSurface.model.bottomNav.activeId}
            onLauncherPress={() => fieldSurface.actions.pushRoute({ kind: 'onboarding' })}
            onSelect={(id: string) => {
              if (id === 'tasks') fieldSurface.actions.resetToStores();
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
