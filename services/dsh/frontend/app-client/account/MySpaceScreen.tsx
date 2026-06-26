// Authority: services/dsh/frontend/app-client — client account surface.
// Sovereign shared: services/dsh/frontend/shared
// No local design system. No hardcoded colors outside theme/colorPalette.

import React from 'react';
import {
  Pressable,
  View,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  type BThwaniAppearanceMode,
  Box,
  Icon,
  MobileScrollView,
  Text,
  TopBar,
  spacing,
  useTheme,
  SegmentedControl,
  useDirection,
  type Language,
} from '@bthwani/ui-kit';

export type MySpaceScreenProps = {
  appearanceMode?: BThwaniAppearanceMode;
  onAppearanceModeChange?: (mode: BThwaniAppearanceMode) => void;
  onOpenOrders?: () => void;
  onOpenWallet?: () => void;
  onOpenBenefits?: (section?: 'loyalty' | 'subscription' | 'offers') => void;
  onOpenAddresses?: () => void;
  onOpenIdentity?: () => void;
  onOpenAppearance?: () => void;
  onOpenPreferences?: () => void;
};

type MySpaceTab =
  | 'orders'
  | 'wallet'
  | 'loyalty'
  | 'subscription'
  | 'offers'
  | 'addresses'
  | 'identity'
  | 'appearance'
  | 'language'
  | 'preferences';

type TabConfig = {
  id: MySpaceTab;
  label: string;
  summary: string;
  iconName: React.ComponentProps<typeof Icon>['name'];
};

const TABS: TabConfig[] = [
  { id: 'orders',       label: 'طلباتي',              summary: 'الطلب والتاريخ والتتبع',                        iconName: 'bag-outline'           },
  { id: 'wallet',       label: 'المحفظة',              summary: 'الرصيد، الاسترداد، وطرق الدفع',                iconName: 'wallet-outline'         },
  { id: 'loyalty',      label: 'النقاط والمكافآت',    summary: 'الرصيد، المستوى، وأقرب ثلاث مكافآت',          iconName: 'star-outline'           },
  { id: 'subscription', label: 'الاشتراك',             summary: 'الخطة الحالية والتبديل عند الحاجة فقط',       iconName: 'card-outline'           },
  { id: 'offers',       label: 'العروض والكوبونات',   summary: 'ثلاث فرص قابلة للاستخدام بدل قائمة طويلة',    iconName: 'pricetag-outline'       },
  { id: 'addresses',    label: 'العناوين والموقع',    summary: 'إدارة العناوين وموقع التوصيل',                  iconName: 'location-outline'       },
  { id: 'identity',     label: 'الملف الشخصي',        summary: 'البيانات الشخصية والأمان',                      iconName: 'person-outline'         },
  { id: 'appearance',   label: 'المظهر',               summary: 'فاتح أبيض أو داكن زجاجي',                     iconName: 'color-palette-outline'  },
  { id: 'language',     label: 'اللغة',                summary: 'العربية أو الإنجليزية',                        iconName: 'globe-outline'          },
  { id: 'preferences',  label: 'تفضيلات التوصيل',     summary: 'إعدادات خاصة بالتسليم والاستبدال',             iconName: 'options-outline'        },
];

// ─── Row ──────────────────────────────────────────────────────────────────────

interface MySpaceRowProps {
  title: string;
  subtitle: string;
  iconName: React.ComponentProps<typeof Icon>['name'];
  onPress?: () => void;
  actionElement?: React.ReactNode;
}

function MySpaceRow({ title, subtitle, iconName, onPress, actionElement }: MySpaceRowProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      accessibilityRole={actionElement ? undefined : 'button'}
      onPress={actionElement ? undefined : onPress}
      disabled={!!actionElement}
      style={({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> => ({
        width: '100%',
        backgroundColor: pressed ? theme.surfaceInset : 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: theme.line,
      })}
    >
      <View
        style={{
          width: '100%',
          paddingHorizontal: spacing[1],
          paddingVertical: spacing[3],
          flexDirection: 'row-reverse',
          alignItems: 'center',
          gap: spacing[3],
        }}
      >
        {/* Icon badge */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 15,
            borderWidth: 1,
            borderColor: theme.line,
            backgroundColor: theme.brandSurface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={iconName} size={21} color={theme.brand} />
        </View>

        {/* Text cluster */}
        <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
          <Text role="bodyStrong" style={{ textAlign: 'right', color: theme.text }}>{title}</Text>
          <Text role="bodySm" tone="muted" style={{ textAlign: 'right', marginTop: 2 }}>
            {subtitle}
          </Text>
        </View>

        {/* Trailing: action or chevron */}
        {actionElement ? (
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            {actionElement}
          </View>
        ) : (
          <View style={{ width: 28, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chevron-back" size={20} color={theme.textSoft} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function MySpaceScreen({
  appearanceMode = 'lightPremium',
  onAppearanceModeChange,
  onOpenOrders,
  onOpenWallet,
  onOpenBenefits,
  onOpenAddresses,
  onOpenIdentity,
  onOpenAppearance,
  onOpenPreferences,
}: MySpaceScreenProps) {
  const { theme } = useTheme();
  const { language, setLanguage } = useDirection();

  const handleRowPress = (id: MySpaceTab) => {
    switch (id) {
      case 'orders':       return onOpenOrders?.();
      case 'wallet':       return onOpenWallet?.();
      case 'loyalty':      return onOpenBenefits?.('loyalty');
      case 'subscription': return onOpenBenefits?.('subscription');
      case 'offers':       return onOpenBenefits?.('offers');
      case 'addresses':    return onOpenAddresses?.();
      case 'identity':     return onOpenIdentity?.();
      case 'appearance':   return onOpenAppearance?.();
      case 'preferences':  return onOpenPreferences?.();
      default:             break;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
      <TopBar variant="surface" title="مساحتي" />

      <MobileScrollView fill padding={4} gap={3}>
        <Box gap={0}>
          {TABS.map((tab) => {
            let actionElement: React.ReactNode;

            if (tab.id === 'appearance') {
              actionElement = (
                <SegmentedControl
                  size="sm"
                  fullWidth={false}
                  style={{ width: 140 }}
                  options={[
                    { value: 'lightPremium', label: 'فاتح' },
                    { value: 'darkGlass',    label: 'داكن' },
                  ]}
                  value={appearanceMode === 'darkGlass' ? 'darkGlass' : 'lightPremium'}
                  onValueChange={(v) => onAppearanceModeChange?.(v as BThwaniAppearanceMode)}
                />
              );
            } else if (tab.id === 'language') {
              actionElement = (
                <SegmentedControl
                  size="sm"
                  fullWidth={false}
                  style={{ width: 140 }}
                  options={[
                    { value: 'ar', label: 'عربي' },
                    { value: 'en', label: 'EN'    },
                  ]}
                  value={language === 'en' ? 'en' : 'ar'}
                  onValueChange={(v) => setLanguage(v as Language)}
                />
              );
            }

            return (
              <MySpaceRow
                key={tab.id}
                title={tab.label}
                subtitle={tab.summary}
                iconName={tab.iconName}
                actionElement={actionElement}
                onPress={() => handleRowPress(tab.id)}
              />
            );
          })}
        </Box>
      </MobileScrollView>
    </View>
  );
}

export default MySpaceScreen;
