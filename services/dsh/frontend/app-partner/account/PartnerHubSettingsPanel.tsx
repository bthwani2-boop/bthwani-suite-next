import React from 'react';
import { Pressable, View } from 'react-native';
import {
  Box,
  Button,
  Chip,
  Divider,
  Icon,
  StateView,
  Surface,
  radius,
  Text,
  spacing,
  typography,
  useDirection,
} from '@bthwani/ui-kit';
import type { BThwaniAppearanceMode } from '@bthwani/ui-kit';
import type {
  DshNotificationChannel,
  DshNotificationPreference,
  DshUpdateNotificationPreferenceInput,
} from '../../shared/notifications';
import { partnerHubTheme, SettingsOptionRow } from './PartnerHubNav';

type PartnerNotificationPreferenceStateKind = 'idle' | 'loading' | 'success' | 'error';

type NotificationTopicMeta = {
  readonly title: string;
  readonly subtitle: string;
  readonly icon: React.ComponentProps<typeof Icon>['name'];
};

const notificationTopicMeta: Readonly<Record<string, NotificationTopicMeta>> = {
  orders: {
    title: 'تنبيهات الطلبات',
    subtitle: 'الطلبات الجديدة، التأخير، وحالات الموافقة والإفراج.',
    icon: 'receipt-outline',
  },
  operations: {
    title: 'تنبيهات التشغيل',
    subtitle: 'الفرع، الفريق، ساعات العمل، والتوصيات السريعة للورديات.',
    icon: 'people-outline',
  },
  inventory: {
    title: 'تنبيهات المخزون',
    subtitle: 'النواقص، المنتجات منخفضة الكمية، وتغييرات الجاهزية.',
    icon: 'cube-outline',
  },
  finance: {
    title: 'تنبيهات المحفظة',
    subtitle: 'التسويات، الأرصدة، وأحداث المحفظة المالية.',
    icon: 'wallet-outline',
  },
  marketing: {
    title: 'التسويق والنمو',
    subtitle: 'العروض والتوصيات الموسمية والفرص المقترحة للنمو.',
    icon: 'megaphone-outline',
  },
  system: {
    title: 'تنبيهات النظام',
    subtitle: 'الهوية، الإعدادات، وحالة الربط العام للحساب.',
    icon: 'shield-checkmark-outline',
  },
  sound: {
    title: 'الصوت والاهتزاز',
    subtitle: 'تفعيل التنبيه السمعي والاهتزازي عند وجود حدث مهم.',
    icon: 'volume-high-outline',
  },
  dailyDigest: {
    title: 'ملخص يومي مختصر',
    subtitle: 'استلام ملخص يومي موحّد بدل فتح أكثر من شاشة منفصلة.',
    icon: 'calendar-outline',
  },
  priorityOnly: {
    title: 'العاجلة فقط',
    subtitle: 'تقليل التشويش وإبراز الحالات ذات الأولوية العالية فقط.',
    icon: 'flash-outline',
  },
};

function getNotificationTopicMeta(topic: string): NotificationTopicMeta {
  return notificationTopicMeta[topic] ?? {
    title: topic,
    subtitle: 'تفضيل محفوظ من DSH لهذا الحساب.',
    icon: 'notifications-outline',
  };
}

function preferenceInput(
  preference: DshNotificationPreference,
  patch: Partial<DshUpdateNotificationPreferenceInput>,
): DshUpdateNotificationPreferenceInput {
  return {
    topic: preference.topic,
    enabled: preference.enabled,
    channels: preference.channels,
    quietHoursStart: preference.quietHoursStart,
    quietHoursEnd: preference.quietHoursEnd,
    locale: preference.locale,
    timezone: preference.timezone || 'Asia/Aden',
    ...patch,
  };
}

function toggledChannels(
  current: readonly DshNotificationChannel[],
  channel: DshNotificationChannel,
): readonly DshNotificationChannel[] {
  if (current.includes(channel)) {
    const next = current.filter((item) => item !== channel);
    return next.length > 0 ? next : ['in_app'];
  }
  return [...current, channel];
}

function channelLabel(channel: DshNotificationChannel): string {
  return channel === 'push' ? 'Push' : 'داخل التطبيق';
}

export function PartnerHubSettingsPanel({
  appearanceMode,
  appearanceHydrated,
  setAppearanceMode,
  notificationPreferences,
  notificationPreferenceState,
  notificationPreferenceError,
  notificationBusy,
  onSaveNotificationPreference,
  onReloadNotificationPreferences,
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
  appearanceHydrated: boolean;
  setAppearanceMode: (mode: BThwaniAppearanceMode) => void;
  notificationPreferences: readonly DshNotificationPreference[];
  notificationPreferenceState: PartnerNotificationPreferenceStateKind;
  notificationPreferenceError?: string | null;
  notificationBusy: boolean;
  onSaveNotificationPreference: (
    input: DshUpdateNotificationPreferenceInput,
  ) => Promise<boolean>;
  onReloadNotificationPreferences: () => Promise<void>;
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
  const appearanceDisabled = !appearanceHydrated;
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
              opacity: appearanceDisabled ? 0.56 : 1,
            }}
          >
            <Pressable
              disabled={appearanceDisabled}
              accessibilityRole="button"
              accessibilityLabel="المظهر الفاتح"
              accessibilityState={{ disabled: appearanceDisabled, selected: appearanceMode === 'lightPremium' }}
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
              disabled={appearanceDisabled}
              accessibilityRole="button"
              accessibilityLabel="المظهر الداكن"
              accessibilityState={{ disabled: appearanceDisabled, selected: appearanceMode === 'darkGlass' }}
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
        {notificationPreferenceState === 'idle' || notificationPreferenceState === 'loading' ? (
          <StateView loading title="جارٍ تحميل التفضيلات" description="نقرأ تفضيلات هذا الحساب من DSH." />
        ) : notificationPreferenceState === 'error' ? (
          <StateView
            tone="warning"
            title="تعذر تحميل التفضيلات"
            description={notificationPreferenceError ?? 'تعذر قراءة تفضيلات هذا الحساب من DSH.'}
            actionLabel="إعادة المحاولة"
            onActionPress={() => { void onReloadNotificationPreferences(); }}
          />
        ) : notificationPreferences.length === 0 ? (
          <StateView title="لا توجد تفضيلات مخصصة" description="تستخدم الإشعارات إعدادات المنصة الافتراضية لهذا الحساب." />
        ) : (
          notificationPreferences.map((preference) => {
            const meta = getNotificationTopicMeta(preference.topic);
            return (
              <React.Fragment key={preference.topic}>
                <SettingsOptionRow
                  icon={meta.icon}
                  title={meta.title}
                  subtitle={meta.subtitle}
                  value={preference.enabled}
                  disabled={notificationBusy}
                  onValueChange={(nextValue) => {
                    void onSaveNotificationPreference(preferenceInput(preference, { enabled: nextValue }));
                  }}
                />
                {showAdvancedNotifications ? (
                  <Surface tone="inset" padding={3} gap={2}>
                    <Text role="caption" tone="muted">القنوات: {preference.channels.map(channelLabel).join('، ')}</Text>
                    <Box layoutDirection="row" gap={2}>
                      {(['in_app', 'push'] as const).map((channel) => (
                        <Button
                          key={channel}
                          label={`${preference.channels.includes(channel) ? '✓ ' : ''}${channelLabel(channel)}`}
                          tone={preference.channels.includes(channel) ? 'primary' : 'secondary'}
                          size="sm"
                          fullWidth={false}
                          disabled={notificationBusy}
                          onPress={() => {
                            void onSaveNotificationPreference(preferenceInput(preference, {
                              channels: toggledChannels(preference.channels, channel),
                            }));
                          }}
                        />
                      ))}
                    </Box>
                    <Box layoutDirection="row" gap={2}>
                      <Button
                        label={preference.quietHoursStart ? 'إلغاء وقت الهدوء' : 'هدوء 22:00–07:00'}
                        tone="secondary"
                        size="sm"
                        fullWidth={false}
                        disabled={notificationBusy}
                        onPress={() => {
                          void onSaveNotificationPreference(preferenceInput(preference, preference.quietHoursStart
                            ? { quietHoursStart: undefined, quietHoursEnd: undefined }
                            : { quietHoursStart: '22:00', quietHoursEnd: '07:00' }));
                        }}
                      />
                      <Button
                        label={preference.locale === 'ar' ? 'العربية' : 'English'}
                        tone="secondary"
                        size="sm"
                        fullWidth={false}
                        disabled={notificationBusy}
                        onPress={() => {
                          void onSaveNotificationPreference(preferenceInput(preference, {
                            locale: preference.locale === 'ar' ? 'en' : 'ar',
                          }));
                        }}
                      />
                    </Box>
                    <Text role="caption" tone="muted">
                      {preference.quietHoursStart && preference.quietHoursEnd
                        ? `وقت الهدوء: ${preference.quietHoursStart}–${preference.quietHoursEnd} (${preference.timezone})`
                        : `لا يوجد وقت هدوء (${preference.timezone})`}
                    </Text>
                  </Surface>
                ) : null}
              </React.Fragment>
            );
          })
        )}
        {notificationPreferenceError && notificationPreferenceState === 'success' ? (
          <StateView tone="danger" title="تعذر حفظ تفضيل الإشعار" description={notificationPreferenceError} />
        ) : null}
        {notificationPreferenceState === 'success' && notificationPreferences.length > 0 ? (
          <Pressable
            disabled={notificationBusy}
            accessibilityRole="button"
            accessibilityLabel={showAdvancedNotifications ? 'إخفاء الإعدادات المتقدمة' : 'عرض الإعدادات المتقدمة'}
            accessibilityState={{ disabled: notificationBusy, expanded: showAdvancedNotifications }}
            onPress={() => setShowAdvancedNotifications(!showAdvancedNotifications)}
          >
            <Text role="bodyStrong" tone="action">
              {showAdvancedNotifications ? 'إخفاء الإعدادات المتقدمة' : 'عرض الإعدادات المتقدمة'}
            </Text>
          </Pressable>
        ) : null}
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
