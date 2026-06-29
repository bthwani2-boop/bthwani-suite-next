// app-field — DshFieldSurface
// Consolidated entrypoint surface for field partner onboarding app.
import React from 'react';
import { BackHandler, Platform, Pressable, View, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, spacing, colorRoles, Icon } from '@bthwani/ui-kit';
import { useDshFieldSurfaceModel } from './field.surface-model';
import type { DshFieldSurfaceProps } from './dsh-field.routes';
import { DshFieldRouteRenderer } from './DshFieldRouteRenderer';
import { useIdentitySession, devBypassLogin, configureIdentitySession } from '@bthwani/core-identity';
import { AuthLoginCard } from '../shared/auth/AuthLoginCard';
import { useAndroidBackHandler } from '../shared/runtime/useAndroidBackHandler';
import { resolveIdentityApiBaseUrl } from '../shared/_kernel/identity-api-base-url';

configureIdentitySession(resolveIdentityApiBaseUrl());

// ─── Bottom Navigation (exact donor replica) ────────────────────────────────
// RTL order visible on screen (left→right): حسابي | المالية | [FAB] | السجل | المهام
// In the items array (RTL render = reversed visual): [tasks, history, FAB, finance, profile]
// We split left/right around the FAB manually for correct positioning.
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
  // Right-side items (visually rightmost in RTL): المهام, السجل
  const rightItems = [
    { id: 'tasks',   label: 'المهام',  icon: 'list-outline',  activeIcon: 'list'  },
    { id: 'history', label: 'السجل',   icon: 'time-outline',  activeIcon: 'time'  },
  ];
  // Left-side items (visually leftmost in RTL): المالية, حسابي
  const leftItems = [
    { id: 'finance', label: 'المالية', icon: 'cash-outline',   activeIcon: 'cash'   },
    { id: 'profile', label: 'حسابي',  icon: 'person-outline', activeIcon: 'person' },
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
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: colorRoles.borderSubtle,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 12,
      }}
    >
      {/* Left items: حسابي | المالية */}
      {leftItems.map((item) => (
        <NavItem key={item.id} {...item} />
      ))}

      {/* Center FAB: إضافة — raised orange circle */}
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
            marginBottom: 24,           // raised above the bar
            opacity: pressed ? 0.88 : 1,
            shadowColor: colorRoles.brandAction,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.45,
            shadowRadius: 10,
            elevation: 8,
          })}
          accessibilityLabel="إضافة ملف جديد"
        >
          <Icon name="add" size={30} color="#FFFFFF" />
        </Pressable>
        <Text
          style={{
            fontSize: 10,
            color: colorRoles.textMuted,
            marginTop: -18,             // pull label up under FAB
          }}
        >
          إضافة
        </Text>
      </View>

      {/* Right items: السجل | المهام */}
      {rightItems.map((item) => (
        <NavItem key={item.id} {...item} />
      ))}
    </View>
  );
}

// ─── Surface ─────────────────────────────────────────────────────────────────
export function DshFieldSurface({ command, onExit }: DshFieldSurfaceProps = {}) {
  const fieldSurface = useDshFieldSurfaceModel(command);

  const identity = useIdentitySession();

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
    }, [fieldSurface.actions, fieldSurface.model.routeStackDepth, onExit])
  );

  // Root authentication guard — prompt for login immediately upon opening
  if (identity.state.kind !== 'authenticated') {
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
        <StatusBar
          backgroundColor={colorRoles.brandAction}
          barStyle="light-content"
          translucent={false}
        />
        <View style={{ flex: 1, justifyContent: 'center', padding: spacing[4] }}>
          <AuthLoginCard
            title="تسجيل دخول الموظف الميداني"
            subtitle="سجّل دخولك لإضافة وإدارة الشركاء."
            loading={identity.state.kind === 'authenticating'}
            {...(identity.state.kind === 'error' ? { error: identity.state.message } : {})}
            onSubmit={(username, password) => void identity.login(username, password)}
            onDevBypass={() => devBypassLogin('field')}
          />
        </View>
      </View>
    );
  }

  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
      {/* Global orange status bar for all screens */}
      <StatusBar
        backgroundColor={colorRoles.brandAction}
        barStyle="light-content"
        translucent={false}
      />

      {/* Screen content */}
      <View
        style={{
          flex: 1,
          paddingBottom: fieldSurface.model.bottomNav.visible ? (72 + insets.bottom) : 0,
        }}
      >
        <DshFieldRouteRenderer
          model={fieldSurface.model}
          actions={fieldSurface.actions}
        />
      </View>

      {/* Bottom nav — pinned to bottom */}
      {fieldSurface.model.bottomNav.visible && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000 }}>
          <FieldBottomNavBar
            activeId={fieldSurface.model.bottomNav.activeId}
            onLauncherPress={() =>
              fieldSurface.actions.pushRoute({ kind: 'onboarding' })
            }
            onSelect={(id: string) => {
              if (id === 'tasks')   fieldSurface.actions.resetToStores();
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

export default DshFieldSurface;
