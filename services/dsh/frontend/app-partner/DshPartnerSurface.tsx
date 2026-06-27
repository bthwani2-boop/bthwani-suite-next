// app-partner — DshPartnerSurface
// Consolidated entrypoint surface for partner operations and catalog app.
import React, { useMemo } from 'react';
import { BackHandler, Platform, Pressable, View, StatusBar } from 'react-native';
import { Text, spacing, colorRoles, Icon, alpha, brandRoots } from '@bthwani/ui-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDshPartnerSurfaceModel } from './partner.surface-model';
import type { DshPartnerSurfaceProps, DshPartnerRouteState } from './dsh-partner.routes';
import { DshPartnerRouteRenderer } from './DshPartnerRouteRenderer';
import { useIdentitySession, devBypassLogin } from '@bthwani/core-identity';
import { AuthLoginCard } from '../shared/auth/AuthLoginCard';
import { useAndroidBackHandler } from '../shared/runtime/useAndroidBackHandler';

const BRAND = brandRoots.brandAction; // #FF500D (Orange)
const WHITE = brandRoots.surfaceBase; // #FFFFFF
const CORNER = 32;

// Curved Premium Header
type PartnerAppHeaderProps = {
  title: string;
  subtitle?: string;
  topInset?: number;
};

function PartnerAppHeader({ title, subtitle, topInset = 0 }: PartnerAppHeaderProps) {
  return (
    <View
      style={[
        headerStyles.container,
        { backgroundColor: BRAND, paddingTop: topInset + spacing[2] },
      ]}
    >
      <View style={headerStyles.row}>
        <View style={headerStyles.titleArea}>
          <Text style={headerStyles.titleText}>{title}</Text>
          {subtitle ? (
            <Text style={[headerStyles.subtitleText, { color: alpha(WHITE, 0.88) }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const headerStyles = {
  container: {
    borderBottomLeftRadius: CORNER,
    borderBottomRightRadius: CORNER,
    paddingBottom: spacing[3],
    paddingHorizontal: spacing[4],
    shadowColor: colorRoles.shadowBase,
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  row: {
    flexDirection: 'row-reverse' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 48,
  },
  titleArea: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  titleText: {
    color: WHITE,
    fontSize: 18,
    fontWeight: '900' as const,
    letterSpacing: -0.5,
    textAlign: 'center' as const,
  },
  subtitleText: {
    fontSize: 11,
    fontWeight: '700' as const,
    marginTop: 2,
    textAlign: 'center' as const,
  },
};

// Custom Bottom Navigation Bar matching RTL and premium aesthetics
function PartnerBottomNavBar({
  activeId,
  onSelect,
}: {
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const tabs = [
    { id: 'onboarding', label: 'حالتي', icon: 'checkmark-circle-outline', activeIcon: 'checkmark-circle' },
    { id: 'store', label: 'متجري', icon: 'storefront-outline', activeIcon: 'storefront' },
    { id: 'catalog', label: 'الكتالوج', icon: 'cube-outline', activeIcon: 'cube' },
    { id: 'orders', label: 'الطلبات', icon: 'receipt-outline', activeIcon: 'receipt' },
    { id: 'support', label: 'الدعم', icon: 'help-circle-outline', activeIcon: 'help-circle' },
  ];

  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        height: 72,
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
      {tabs.map((item) => {
        const isActive = activeId === item.id;
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[2] }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Icon
              name={isActive ? item.activeIcon : item.icon}
              size={22}
              tone={isActive ? 'brand' : 'muted'}
            />
            <Text
              style={{
                fontSize: 10,
                marginTop: 2,
                color: isActive ? BRAND : colorRoles.textMuted,
                fontWeight: isActive ? '700' : '400',
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function DshPartnerSurface({ command, onExit }: DshPartnerSurfaceProps = {}) {
  const partnerSurface = useDshPartnerSurfaceModel(command);
  const insets = useSafeAreaInsets();
  const identity = useIdentitySession();

  useAndroidBackHandler(
    React.useCallback(() => {
      if (partnerSurface.model.routeStackDepth > 1) {
        partnerSurface.actions.popRoute();
        return true;
      }
      if (onExit) {
        onExit();
        return true;
      }
      return false;
    }, [partnerSurface.actions, partnerSurface.model.routeStackDepth, onExit])
  );

  const headerInfo = useMemo(() => {
    switch (partnerSurface.model.route.kind) {
      case 'onboarding':
        return {
          title: 'حالة تأهيل متجرك',
          subtitle: 'متابعة مرحلة التفعيل الحالية للمتجر في المنصة',
        };
      case 'store':
        return {
          title: 'مركز تشغيل المتجر',
          subtitle: 'إدارة متجرك والاطلاع على حالة الاتصال والظهور',
        };
      case 'catalog':
        return {
          title: 'كتالوج المنتجات',
          subtitle: 'إضافة وتعديل الأقسام والمنتجات المتاحة',
        };
      case 'orders':
        return {
          title: 'طلبات المتجر',
          subtitle: 'تجهيز وقبول الطلبات الواردة من العملاء',
        };
      case 'support':
        return {
          title: 'دعم الشريك',
          subtitle: 'تواصل مع الدعم الفني لحل مشكلات متجرك',
        };
      case 'performance':
        return {
          title: 'أداء متجري',
          subtitle: 'مؤشرات أداء متجرك التشغيلية',
        };
      case 'settlement':
        return {
          title: 'حالة التسوية',
          subtitle: 'تفاصيل التسوية المالية للطلب من WLT',
        };
      case 'documents':
        return {
          title: 'وثائقي المعتمدة',
          subtitle: 'عرض وتتبع حالة وثائق الشراكة والنشاط',
        };
      case 'requirements':
        return {
          title: 'متطلبات التفعيل الأساسية',
          subtitle: 'المستندات والمراحل التشغيلية المطلوبة للاعتماد',
        };
      default:
        return {
          title: 'بوابة الشركاء',
          subtitle: 'متابعة وتأهيل عمليات متجرك المباشرة',
        };
    }
  }, [partnerSurface.model.route.kind]);

  // Root authentication guard — prompt for login immediately upon opening
  if (identity.state.kind !== 'authenticated') {
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
        <StatusBar
          backgroundColor={BRAND}
          barStyle="light-content"
          translucent={false}
        />
        <View style={{ flex: 1, justifyContent: 'center', padding: spacing[4] }}>
          <AuthLoginCard
            title="تسجيل دخول الشريك"
            subtitle="استخدم حساب الشريك المحلي المصرح به لهذا المتجر."
            loading={identity.state.kind === 'authenticating'}
            {...(identity.state.kind === 'error' ? { error: identity.state.message } : {})}
            onSubmit={(username, password) => void identity.login(username, password)}
            onDevBypass={() => devBypassLogin('partner')}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
      <StatusBar
        backgroundColor={BRAND}
        barStyle="light-content"
        translucent={false}
      />

      <PartnerAppHeader
        title={headerInfo.title}
        subtitle={headerInfo.subtitle}
        topInset={insets.top}
      />

      {/* Screen content */}
      <View
        style={{
          flex: 1,
          paddingBottom: partnerSurface.model.bottomNav.visible ? 72 : 0,
        }}
      >
        <DshPartnerRouteRenderer
          model={partnerSurface.model}
          actions={partnerSurface.actions}
        />
      </View>

      {/* Bottom nav — pinned to bottom */}
      {partnerSurface.model.bottomNav.visible && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000 }}>
          <PartnerBottomNavBar
            activeId={partnerSurface.model.bottomNav.activeId}
            onSelect={(id: string) => {
              if (id === 'onboarding') partnerSurface.actions.pushRoute({ kind: 'onboarding' });
              if (id === 'store') partnerSurface.actions.pushRoute({ kind: 'store' });
              if (id === 'catalog') partnerSurface.actions.pushRoute({ kind: 'catalog' });
              if (id === 'orders') partnerSurface.actions.pushRoute({ kind: 'orders' });
              if (id === 'support') partnerSurface.actions.pushRoute({ kind: 'support' });
            }}
          />
        </View>
      )}
    </View>
  );
}

export default DshPartnerSurface;
