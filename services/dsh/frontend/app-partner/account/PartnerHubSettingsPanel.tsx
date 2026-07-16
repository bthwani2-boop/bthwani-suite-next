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
      {/* Appearance Section */}
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

      <Divider />

      {/* Current Preferences */}
      <Box padding={0} gap={0}>
        <Text role="label" tone="muted" style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[2] }}>
          التفضيلات الحالية
        </Text>
        {([
          { label: 'مستوى التنبيه', value: notificationPreferences.priorityOnly ? 'العاجلة فقط' : 'كل التنبيهات', tone: notificationPreferences.priorityOnly ? 'warning' : 'success' },
          { label: 'الصوت والاهتزاز', value: notificationPreferences.sound ? 'مفعّل' : 'موقوف', tone: notificationPreferences.sound ? 'success' : 'warning' },
          { label: 'الملخص اليومي', value: notificationPreferences.dailyDigest ? 'مفعّل' : 'موقوف', tone: notificationPreferences.dailyDigest ? 'info' : 'default' },
          { label: 'الظهور في القائمة', value: resolvedListingEnabled ? 'مفعل' : 'موقوف', tone: resolvedListingEnabled ? 'success' : 'warning' },
          { label: 'حالة المتجر', value: isAvailable ? 'مفتوح الآن' : 'مغلق الآن', tone: isAvailable ? 'success' : 'warning' },
          { label: 'ساعات العمل', value: todayHoursLabel, tone: 'default' },
        ] as const).map((item, index, arr) => (
          <View
            key={item.label}
            style={{
              flexDirection: rowDirection,
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing[4],
              paddingVertical: spacing[3],
              backgroundColor: theme.surface,
              borderBottomWidth: index === arr.length - 1 ? 0 : 1,
              borderBottomColor: theme.line,
            }}
          >
            <Text role="body" style={{ color: theme.text }}>
              {item.label}
            </Text>
            <Chip label={item.value} />
          </View>
        ))}
      </Box>

      <Divider />

      {/* Notification Preferences */}
      <Box padding={0} gap={0}>
        <Text role="label" tone="muted" style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[2] }}>
          إعدادات الإشعارات
        </Text>
        {primaryNotificationRows.map((item) => (
          <SettingsOptionRow
            key={item.id}
            title={item.title}
            subtitle={item.subtitle}
            icon={item.icon}
            value={item.value}
            onValueChange={(nextValue) => updateNotificationPreference(item.id, nextValue)}
            compact={true}
            last={false}
          />
        ))}

        <Pressable
          onPress={() => setShowAdvancedNotifications(!showAdvancedNotifications)}
          style={({ pressed }) => ({
            flexDirection: rowDirection,
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing[4],
            paddingVertical: 10,
            backgroundColor: pressed ? theme.surfaceInset : theme.surface,
            borderBottomWidth: showAdvancedNotifications ? 1 : 0,
            borderBottomColor: theme.line,
          })}
        >
          <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 10, flexShrink: 1, minWidth: 0 }}>
            <Icon name="options-outline" size={18} tone="muted" style={{ flexShrink: 0 }} />
            <View style={{ flexShrink: 1, minWidth: 0, gap: 2, alignItems: direction === 'rtl' ? 'flex-end' : 'flex-start' }}>
              <Text role="bodyStrong" style={{ color: theme.brand, textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                إعدادات متقدمة
              </Text>
              <Text role="bodySm" tone="muted" style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                إدارة إعدادات الصوت، الملخصات والتسويق
              </Text>
            </View>
          </View>
          <Icon name={showAdvancedNotifications ? "chevron-down-outline" : "chevron-forward-outline"} mirrored tone="muted" size={18} />
        </Pressable>

        {showAdvancedNotifications && secondaryNotificationRows.map((item, index, arr) => (
          <SettingsOptionRow
            key={item.id}
            title={item.title}
            subtitle={item.subtitle}
            icon={item.icon}
            value={item.value}
            onValueChange={(nextValue) => updateNotificationPreference(item.id, nextValue)}
            compact={true}
            last={index === arr.length - 1}
          />
        ))}
      </Box>

      <Divider />

      {/* Quick Access */}
      <Box padding={0} gap={0}>
        <Text role="label" tone="muted" style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[2] }}>
          الوصول السريع
        </Text>
        {[
          {
            id: 'order-alerts',
            title: 'فتح تنبيهات الطلب',
            icon: 'notifications-outline' as const,
            onPress: openOrderAlerts,
          },
          {
            id: 'branch-scope',
            title: 'اختيار الفرع',
            icon: 'git-branch-outline' as const,
            onPress: onOpenStoreScope,
          },
          {
            id: 'operations-directory',
            title: 'دليل العمليات',
            icon: 'headset-outline' as const,
            onPress: openOperationsDirectory,
          },
        ].map((item, index, arr) => (
          <Pressable
            key={item.id}
            onPress={item.onPress}
            style={({ pressed }) => ({
              flexDirection: rowDirection,
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing[4],
              paddingVertical: spacing[3],
              backgroundColor: pressed ? theme.surfaceInset : theme.surface,
              borderBottomWidth: index === arr.length - 1 ? 0 : 1,
              borderBottomColor: theme.line,
            })}
          >
            <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 10, flexShrink: 1, minWidth: 0 }}>
              <Icon name={item.icon} size={18} tone="muted" style={{ flexShrink: 0 }} />
              <Text role="bodyStrong" style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                {item.title}
              </Text>
            </View>
            <Icon name="chevron-forward-outline" mirrored tone="muted" size={18} />
          </Pressable>
        ))}
      </Box>

      {/* Safe area spacer for bottom navigation */}
      <View style={{ height: 140 }} />
    </Box>
  );
}
