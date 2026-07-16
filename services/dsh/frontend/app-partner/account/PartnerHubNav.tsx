import React from 'react';
import { Pressable, Switch as RNSwitch, View, BackHandler } from 'react-native';
import {
  Box,
  Chip,
  colorRoles,
  Icon,
  MobileScrollView,
  Text,
  useDirection,
  radius,
  spacing,
} from '@bthwani/ui-kit';
import { getWltDshPartnerCommissionLabel, wltDshPartnerUiCopy } from '../../shared/finance/partner-finance';
import type { PartnerHubSection } from '../dsh-partner.types';
import type {
  HubNavigationItem,
  PartnerOperationalMode,
  SummaryItem,
} from '../../shared/partner/partner-hub.types';

// Shared visual theme for the partner hub screen and its extracted panels.
// Named `partnerHubTheme` (not `theme`) to avoid colliding with `useTheme()`
// calls elsewhere in this module tree.
export const partnerHubTheme = {
  brand: colorRoles.brandAction,
  brandSurface: colorRoles.brandActionSoft,
  brandContrast: colorRoles.textInverse,
  surface: colorRoles.surfaceBase,
  surfaceInset: colorRoles.surfaceInset,
  surfaceRaised: colorRoles.surfaceMuted,
  line: colorRoles.borderSubtle,
  lineStrong: colorRoles.borderStrong,
  text: colorRoles.textPrimary,
  textInverse: colorRoles.textInverse,
  success: colorRoles.success,
  warning: colorRoles.warning,
  danger: colorRoles.danger,
  info: colorRoles.info,
} as const;

export const partnerHubBottomInset = 144;

export const hubNavigationItems: readonly HubNavigationItem[] = [
  {
    id: 'profile',
    title: 'ملف المتجر',
    description: 'بيانات المتجر، الهوية، الظهور، الفرع، والنطاق في مساحة واحدة.',
    icon: 'storefront-outline',
    section: 'profile',
  },
  {
    id: 'wallet',
    title: wltDshPartnerUiCopy.walletSectionTitle,
    description: wltDshPartnerUiCopy.walletSectionDescription,
    icon: 'wallet-outline',
    section: 'wallet',
  },
  {
    id: 'operations',
    title: 'المتجر والفريق',
    description: 'حالة المتجر، التوصيل، الفريق، ومناطق التغطية.',
    icon: 'people-outline',
    section: 'operations',
  },
  {
    id: 'inventory',
    title: 'المخزون والكتالوج',
    description: 'بحث أولًا، إضافة ذكية، أسعار ومخزون بدون تكرار.',
    icon: 'cube-outline',
    section: 'inventory',
  },
  {
    id: 'analytics',
    title: 'التحليلات والنمو والتسويق',
    description: 'الأداء، الفرص، العروض، الاشتراك، والتوصيات العملية.',
    icon: 'trending-up-outline',
    section: 'analytics',
  },
  {
    id: 'settings',
    title: 'الإعدادات',
    description: 'التنبيهات، اللغة، التفضيلات، وإعدادات المتجر.',
    icon: 'settings-outline',
    section: 'settings',
  },
] as const;

export const sectionCopy: Record<Exclude<PartnerHubSection, 'hub'>, { title: string; description: string; icon: React.ComponentProps<typeof Icon>['name'] }> = {
  profile: {
    title: 'ملف المتجر',
    description: 'بيانات المتجر، الهوية، الظهور، الفرع، والنطاق في مساحة واحدة.',
    icon: 'storefront-outline',
  },
  operations: {
    title: 'المتجر والفريق',
    description: 'حالة المتجر، التوصيل، الفريق، ومناطق التغطية.',
    icon: 'people-outline',
  },
  inventory: {
    title: 'المخزون والكتالوج',
    description: 'بحث أولًا، إضافة ذكية، أسعار ومخزون بدون تكرار.',
    icon: 'cube-outline',
  },
  wallet: {
    title: wltDshPartnerUiCopy.walletSectionTitle,
    description: wltDshPartnerUiCopy.walletSectionDescription,
    icon: 'wallet-outline',
  },
  analytics: {
    title: 'التحليلات والنمو والتسويق',
    description: 'الأداء، الفرص، العروض، الاشتراك، والتوصيات العملية.',
    icon: 'trending-up-outline',
  },
  settings: {
    title: 'الإعدادات',
    description: 'التنبيهات، اللغة، التفضيلات، وإعدادات المتجر.',
    icon: 'settings-outline',
  },
};

export function SummaryCell({ label, value, tone = 'default' }: Omit<SummaryItem, 'id'>) {

  const accentColor =
    tone === 'success'
      ? partnerHubTheme.success
      : tone === 'warning'
        ? partnerHubTheme.warning
        : tone === 'danger'
          ? partnerHubTheme.danger
          : tone === 'brand'
            ? partnerHubTheme.brand
            : tone === 'info'
              ? partnerHubTheme.info
              : partnerHubTheme.lineStrong;

  // Map local tone (which includes 'brand') to Text's valid tone values
  const textTone: 'default' | 'action' | 'success' | 'warning' | 'danger' | 'info' =
    tone === 'brand' ? 'action' : tone === 'default' ? 'default' : tone;

  return (
    <Box
      padding={3}
      gap={1}
      style={{ flex: 1, minWidth: 96, borderBottomWidth: 2, borderBottomColor: accentColor }}
    >
      <Text role="caption" tone="muted" numberOfLines={1} align="start">
        {label}
      </Text>
      <Text role="bodyStrong" tone={textTone} numberOfLines={1} align="start">
        {value}
      </Text>
    </Box>
  );
}

export function SettingsOptionRow({
  title,
  subtitle,
  icon,
  value,
  onValueChange,
  onPress,
  last = false,
  disabled = false,
  compact = false,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  value?: boolean;
  onValueChange?: (nextValue: boolean) => void;
  onPress?: () => void;
  last?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  const { direction } = useDirection();

  const rowDirection = direction === 'rtl' ? 'row-reverse' : 'row';
  const isSwitchRow = typeof value === 'boolean' && typeof onValueChange === 'function';

  return (
    <Pressable
      accessibilityRole={isSwitchRow ? undefined : 'button'}
      accessibilityLabel={title}
      accessibilityState={isSwitchRow ? undefined : { disabled }}
      disabled={disabled}
      onPress={isSwitchRow ? undefined : onPress}
      style={({ pressed }) => [
        {
          width: '100%',
          paddingHorizontal: spacing[4],
          paddingVertical: compact ? 10 : 14,
          backgroundColor: pressed ? partnerHubTheme.surfaceInset : partnerHubTheme.surface,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: partnerHubTheme.line,
          opacity: disabled ? 0.56 : 1,
        },
      ]}
    >
      <View style={{ flexDirection: rowDirection, alignItems: 'center' }}>
        <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: compact ? 10 : 12, flexShrink: 1, minWidth: 0 }}>
          {compact ? (
            <Icon name={icon} size={18} tone={isSwitchRow && value ? 'brand' : 'muted'} style={{ flexShrink: 0 }} />
          ) : (
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: partnerHubTheme.surfaceInset,
                borderWidth: 1,
                borderColor: partnerHubTheme.line,
                flexShrink: 0,
              }}
            >
              <Icon name={icon} size={17} tone={isSwitchRow && value ? 'brand' : 'muted'} />
            </View>
          )}

          <View style={{ flexShrink: 1, minWidth: 0, gap: 2, alignItems: direction === 'rtl' ? 'flex-end' : 'flex-start' }}>
            <Text role="bodyStrong" style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }} numberOfLines={1}>
              {title}
            </Text>
            <Text role="bodySm" tone="muted" style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }} numberOfLines={2}>
              {subtitle}
            </Text>
          </View>
        </View>

        <View style={{ flex: 1 }} />

        {isSwitchRow ? (
          <RNSwitch
            disabled={disabled}
            value={value}
            onValueChange={onValueChange}
            thumbColor={value ? partnerHubTheme.brandContrast : partnerHubTheme.surfaceRaised}
            trackColor={{ false: partnerHubTheme.lineStrong, true: partnerHubTheme.brand }}
            ios_backgroundColor={partnerHubTheme.lineStrong}
          />
        ) : (
          <Icon name="chevron-forward-outline" mirrored tone="muted" size={18} />
        )}
      </View>
    </Pressable>
  );
}

/** Section shell — no TopBar/back button; hardware back handles navigation.
 * Section title is displayed inline as a visual header inside the content. */
export function HubSectionShell({
  title,
  icon,
  onBack,
  children,
}: {
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  onBack: () => void;
  children?: React.ReactNode;
}) {
  const { direction } = useDirection();

  const rowDirection = direction === 'rtl' ? 'row-reverse' : 'row';

  React.useEffect(() => {
    const backAction = () => {
      onBack();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onBack]);

  return (
    <MobileScrollView fill padding={4} gap={4} contentContainerStyle={{ paddingBottom: partnerHubBottomInset }}>
      {/* Visual section title — no back button, hardware back handles it */}
      <View
        style={{
          flexDirection: rowDirection,
          alignItems: 'center',
          gap: spacing[3],
          paddingBottom: spacing[1],
          borderBottomWidth: 1,
          borderBottomColor: partnerHubTheme.line,
          marginBottom: spacing[1],
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: partnerHubTheme.brandSurface,
            flexShrink: 0,
          }}
        >
          <Icon name={icon} size={18} tone="brand" />
        </View>
        <Text
          role="titleSm"
          style={{ textAlign: direction === 'rtl' ? 'right' : 'left', flex: 1 }}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      <View style={{ gap: spacing[4] }}>
        {children}
      </View>
    </MobileScrollView>
  );
}

/** Premium nav row: icon + title + subtitle on the content side, chevron on the action side. RTL-correct. */
export function HubNavRow({
  title,
  description,
  icon,
  onPress,
}: {
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  onPress: () => void;
}) {
  const { direction } = useDirection();

  const rowDirection = direction === 'rtl' ? 'row-reverse' : 'row';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: rowDirection,
        alignItems: 'center',
        paddingHorizontal: spacing[4],
        paddingVertical: 14,
        borderRadius: radius.md,
        backgroundColor: pressed ? partnerHubTheme.surfaceInset : partnerHubTheme.surfaceRaised,
        gap: spacing[3],
        borderWidth: 1,
        borderColor: partnerHubTheme.line,
      })}
    >
      {/* Icon + Text cluster — stays together on the content side */}
      <View
        style={{
          flexDirection: rowDirection,
          alignItems: 'center',
          gap: spacing[3],
          flex: 1,
          minWidth: 0,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: partnerHubTheme.brandSurface,
            borderWidth: 1,
            borderColor: partnerHubTheme.brand + '33',
            flexShrink: 0,
          }}
        >
          <Icon name={icon} size={20} tone="brand" />
        </View>

        <View
          style={{
            flex: 1,
            minWidth: 0,
            gap: 2,
            alignItems: direction === 'rtl' ? 'flex-end' : 'flex-start',
          }}
        >
          <Text
            role="bodyStrong"
            numberOfLines={1}
            style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}
          >
            {title}
          </Text>
          <Text
            role="bodySm"
            tone="muted"
            numberOfLines={2}
            style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}
          >
            {description}
          </Text>
        </View>
      </View>

      {/* Chevron — always on the action/opposite side */}
      <Icon name="chevron-forward-outline" mirrored tone="muted" size={18} />
    </Pressable>
  );
}

export function resolveServiceModeEnabled(serviceModes: readonly { id: string; enabled: boolean }[] | undefined, modeId: PartnerOperationalMode['id'], fallback: boolean) {
  const matched = serviceModes?.find((mode) => {
    if (modeId === 'pickup') return mode.id === 'pickup';
    // transitional aliases: legacy `delivery` plus textual `store delivery` / `partner delivery`
    // all map to canonical `partner_delivery` which is displayed as "توصيل المتجر".
    if (modeId === 'partner_delivery') {
      return mode.id === 'partner_delivery'
        || mode.id === 'partner delivery'
        || mode.id === 'delivery'
        || mode.id === 'store-delivery'
        || mode.id === 'store delivery';
    }
    // transitional aliases: legacy 'scheduled' / 'seconds' map to bthwani_delivery
    return mode.id === 'bthwani_delivery' || mode.id === 'scheduled' || mode.id === 'seconds';
  });

  return matched?.enabled ?? fallback;
}

export function OperationsModeRow({
  mode,
  selected,
  onPress,
}: {
  mode: PartnerOperationalMode;
  selected: boolean;
  onPress: () => void;
}) {
  const { direction } = useDirection();


  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={mode.title}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: '100%',
          paddingHorizontal: spacing[4],
          paddingVertical: 14,
          backgroundColor: pressed ? partnerHubTheme.surfaceInset : partnerHubTheme.surface,
          borderBottomWidth: 1,
          borderBottomColor: partnerHubTheme.line,
        },
      ]}
    >
      <View
        style={{
          flexDirection: direction === 'rtl' ? 'row-reverse' : 'row',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            flexDirection: direction === 'rtl' ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: 10,
            flex: 1,
            minWidth: 0,
          }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 13,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? partnerHubTheme.brandSurface : partnerHubTheme.surfaceInset,
              borderWidth: 1,
              borderColor: selected ? partnerHubTheme.brand : partnerHubTheme.line,
              flexShrink: 0,
            }}
          >
            <Icon name={mode.id === 'pickup' ? 'hand-left-outline' : mode.id === 'partner_delivery' ? 'car-outline' : 'bicycle-outline'} size={16} tone={selected ? 'brand' : 'muted'} />
          </View>

          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text role="bodyStrong" align="start" numberOfLines={1}>
              {mode.title}
            </Text>
            <Text role="bodySm" tone="muted" align="start" numberOfLines={1}>
              {mode.subtitle}
            </Text>
          </View>
        </View>

        <View style={{ alignItems: direction === 'rtl' ? 'flex-start' : 'flex-end', gap: spacing[1], marginEnd: 10 }}>
          <Chip label={mode.enabled ? 'مفعّل' : 'غير مفعّل'} />
          <Text role="caption" tone="muted">
            {getWltDshPartnerCommissionLabel(mode.commission)}
          </Text>
        </View>

        <Icon name="chevron-forward-outline" mirrored tone="muted" size={18} />
      </View>
    </Pressable>
  );
}
