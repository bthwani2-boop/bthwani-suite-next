// Authority: services/dsh/frontend/app-client — appearance sub-screen.
// Sovereign shared: services/dsh/frontend/shared

import React from 'react';
import { View } from 'react-native';
import {
  AppearanceOptionCard,
  Box,
  Icon,
  MobileScrollView,
  TopBar,
  useTheme,
  type BThwaniAppearanceMode,
} from '@bthwani/ui-kit';

export type AppearanceHubScreenProps = {
  appearanceMode?: BThwaniAppearanceMode;
  onAppearanceModeChange?: (mode: BThwaniAppearanceMode) => void;
  onBack?: () => void;
};

export function AppearanceHubScreen({
  appearanceMode = 'lightPremium',
  onAppearanceModeChange,
  onBack,
}: AppearanceHubScreenProps) {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
      <TopBar
        variant="surface"
        title="المظهر والسمات"
        subtitle="اختر المظهر المناسب لتجربتك"
        actions={
          onBack
            ? [{ id: 'back', icon: <Icon name="chevron-back" mirrored size={18} />, accessibilityLabel: 'العودة', onPress: onBack }]
            : []
        }
      />

      <MobileScrollView fill padding={4} gap={4}>
        <Box gap={4} paddingY={2}>
          <AppearanceOptionCard
            title="المظهر الفاتح الراقي"
            description="قاعدة بيضاء نقية مع لمسات زجاجية خفيفة وتفاصيل برتقالية ناصعة مناسبة للقراءة النهارية."
            mode="lightPremium"
            selected={appearanceMode === 'lightPremium'}
            modeLabel="Light Premium"
            statusLabel="افتراضي"
            onPress={() => onAppearanceModeChange?.('lightPremium')}
          />

          <AppearanceOptionCard
            title="الوضع الداكن الزجاجي"
            description="تأثيرات زجاجية معتمة مصممة خصيصًا لتقليل إجهاد العين ليلاً في البيئات المظلمة."
            mode="darkGlass"
            selected={appearanceMode === 'darkGlass'}
            modeLabel="Dark Glass"
            statusLabel="تأثير زجاجي"
            onPress={() => onAppearanceModeChange?.('darkGlass')}
          />
        </Box>
      </MobileScrollView>
    </View>
  );
}

export default AppearanceHubScreen;
