import React from 'react';
import { Pressable, View } from 'react-native';
import { Box, Chip, Divider, Icon, radius, Text, spacing, typography, useDirection } from '@bthwani/ui-kit';
import { wltDshPartnerUiCopy } from '../../shared/finance/partner-finance';
import type { BThwaniAppearanceMode, NotificationPreferenceId, NotificationPreferenceState } from '../../shared/partner/partner-hub.types';
import { partnerHubTheme, SettingsOptionRow } from './PartnerHubNav';

export function PartnerHubSettingsPanel({
  appearanceMode,
  setAppearanceMode,
  notificationPreferences,
  updateNotificationPreference,
  showAdvancedNotifications,
  setShowAdvancedNotifications,
  resolvedListingEnabled,
  isAvailable,
  todayHoursLabel,
  openOrderAlerts,
  onOpenStoreScope,
  openOperationsDirectory,
}: {
  appearanceMode: BThwaniAppearanceMode;
  appearanceHydrated?: boolean;
  setAppearanceMode: (mode: BThwaniAppearanceMode) => void;
  notificationPreferences: NotificationPreferenceState;
  updateNotificationPreference: (preferenceId: NotificationPreferenceId, nextValue: boolean) => void;
  showAdvancedNotifications: boolean;
  setShowAdvancedNotifications: (next: boolean) => void;
  resolvedListingEnabled: boolean;
  isAvailable: boolean;
  todayHoursLabel: string;
  openOrderAlerts: () => void;
  onOpenStoreScope?: () => void;
  openOperationsDirectory: () => void;
}) {
  const { direction } = useDirection();
  const theme = partnerHubTheme;

  const primaryNotificationRows = [
    {
      id: 'orders' as const,
      title: 'تنبيهات الطلبات',
      subtitle: 'الطلبات الجديدة، التأخير، وحالات الموافقة والإفراج.',
      icon: 'receipt-outline' as const,
      value: notificationPreferences.orders,
    },
    {
      id: 'operations' as const,
      title: 'تنبيهات التشغيل',
      subtitle: 'الفرع، الفريق، ساعات العمل، والتوصيات السريعة للورديات.',
      icon: 'people-outline' as const,
      value: notificationPreferences.operations,
    },
    {
      id: 'inventory' as const,
      title: 'تنبيهات المخزون',
      subtitle: 'النواقص، المنتجات منخفضة الكمية، وتغييرات الجاهزية.',
      icon: 'cube-outline' as const,
      value: notificationPreferences.inventory,
    },
    {
      id: 'finance' as const,
      title: wltDshPartnerUiCopy.financeNotificationTitle,
      subtitle: wltDshPartnerUiCopy.financeNotificationSubtitle,
      icon: 'wallet-outline' as const,
      value: notificationPreferences.finance,
    },
  ];

  const secondaryNotificationRows = [
    {
      id: 'marketing' as const,
      title: 'التسويق والنمو',
      subtitle: 'العروض والتوصيات الموسمية والفرص المقترحة للنمو.',
      icon: 'megaphone-outline' as const,
      value: notificationPreferences.marketing,
    },
    {
      id: 'system' as const,
      title: 'تنبيهات النظام',
      subtitle: 'الهوية، الإعدادات، وحالة الربط العام للحساب.',
      icon: 'shield-checkmark-outline' as const,
      value: notificationPreferences.system,
    },
    {
      id: 'sound' as const,
      title: 'الصوت والاهتزاز',
      subtitle: 'تفعيل التنبيه السمعي والاهتزازي عند وجود حدث مهم.',
      icon: 'volume-high-outline' as const,
      value: notificationPreferences.sound,
    },
    {
      id: 'dailyDigest' as const,
      title: 'ملخص يومي مختصر',
      subtitle: 'استلام ملخص يومي موحّد بدل فتح أكثر من شاشة منفصلة.',
      icon: 'calendar-outline' as const,
      value: notificationPreferences.dailyDigest,
    },
    {
      id: 'priorityOnly' as const,
      title: 'العاجلة فقط',
      subtitle: 'تقليل التشويش وإبراز الحالات ذات الأولوية العالية فقط.',
      icon: 'flash-outline' as const,
      value: notificationPreferences.priorityOnly,
    },
  ];

  const rowDirection = direction === 'rtl' ? 'row-reverse' : 'row';

  return (
    <Box gap={4}>
      <Box padding={0} gap={0}>
        <View
          style={{
            flexDirection: rowDirection,
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing[4],
            paddingVertical: 14,
            backgroundColor: theme.surface,
          }}
        >
          <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: spacing[3], flexShrink: 1, minWidth: 0 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: radius.sm,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.surfaceInset,
                borderWidth: 1,
                borderColor: theme.line,
                flexShrink: 0,
              }}
            >
              <Icon name="color-palette-outline" size={17} tone="muted" />
            </View>
            <View style={{ flexShrink: 1, minWidth: 0, gap: 2, alignItems: direction === 'rtl' ? 'flex-end' : 'flex-start' }}>
              <Text role="bodyStrong" style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }} numberOfLines={1}>
                المظهر
              </Text>
              <Text role="bodySm" tone="muted" style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }} numberOfLines={1}>
                فاتح أبيض أو داكن زجاجي
              </Text>
            </View>
          </View>

          <View
            style={{
              flexDirection: rowDirection,
              backgroundColor: theme.surfaceInset,
              borderRadius: radius.sm,
              padding: 3,
              borderWidth: 1,
              borderColor: theme.line,
              gap: spacing[1],
            }}
          >
            <Pressable
              onPress={() => setAppearanceMode('lightPremium')}
              style={{
                paddingHorizontal: spacing[3],
                paddingVertical: 6,
                borderRadius: 9,
                backgroundColor: appearanceMode === 'lightPremium' ? theme.brand : 'transparent',
              }}
            >
              <Text
                role="bodyStrong"
                style={{
                  fontSize: typography.caption.fontSize,
                  color: appearanceMode === 'lightPremium' ? theme.brandContrast : theme.text,
                }}
              >
                فاتح
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setAppearanceMode('darkGlass')}
              style={{
                paddingHorizontal: spacing[3],
                paddingVertical: 6,
                borderRadius: 9,
                backgroundColor: appearanceMode === 'darkGlass' ? theme.brand : 'transparent',
              }}
            >
              <Text
                role="bodyStrong"
                style={{
                  fontSize: typography.caption.fontSize,
                  color: appearanceMode === 'darkGlass' ? theme.brandContrast : theme.text,
                }}
              >
                داكن
              </Text>
            </Pressable>
          </View>
        </View>
      </Box>

      <Box padding={4} gap={3} background="surface">
        <Text role="titleSm">الإشعارات</Text>
        {primaryNotificationRows.map((item) => (
          <SettingsOptionRow
            key={item.id}
            icon={item.icon}
            title={item.title}
            subtitle={item.subtitle}
            value={item.value}
            onToggle={() => updateNotificationPreference(item.id, !item.value)}
          />
        ))}
        <Pressable onPress={() => setShowAdvancedNotifications(!showAdvancedNotifications)}>
          <Text role="bodyStrong" tone="brand">
            {showAdvancedNotifications ? 'إخفاء الإعدادات المتقدمة' : 'عرض الإعدادات المتقدمة'}
          </Text>
        </Pressable>
        {showAdvancedNotifications
          ? secondaryNotificationRows.map((item) => (
              <SettingsOptionRow
                key={item.id}
                icon={item.icon}
                title={item.title}
                subtitle={item.subtitle}
                value={item.value}
                onToggle={() => updateNotificationPreference(item.id, !item.value)}
              />
            ))
          : null}
      </Box>

      <Box padding={4} gap={3} background="surface">
        <Text role="titleSm">حالة المتجر</Text>
        <View style={{ flexDirection: rowDirection, flexWrap: 'wrap', gap: spacing[2] }}>
          <Chip label={isAvailable ? 'المتجر مفتوح' : 'المتجر مغلق'} selected={isAvailable} />
          <Chip label={resolvedListingEnabled ? 'الظهور مفعل' : 'الظهور متوقف'} selected={resolvedListingEnabled} />
          <Chip label={todayHoursLabel} selected />
        </View>
        <Divider />
        <SettingsOptionRow
          icon="notifications-outline"
          title="تنبيهات الطلبات"
          subtitle="مراجعة الطلبات والتنبيهات التشغيلية الفعلية."
          onPress={openOrderAlerts}
        />
        {onOpenStoreScope ? (
          <SettingsOptionRow
            icon="git-branch-outline"
            title="نطاق المتجر"
            subtitle="تغيير المتجر أو الفرع النشط."
            onPress={onOpenStoreScope}
          />
        ) : null}
        <SettingsOptionRow
          icon="construct-outline"
          title="دليل العمليات"
          subtitle="فتح مسارات التشغيل والدعم المرتبطة."
          onPress={openOperationsDirectory}
        />
      </Box>
    </Box>
  );
}
