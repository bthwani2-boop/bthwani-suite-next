// Authority: services/dsh/frontend/app-client — appearance sub-screen.
// Sovereign shared: services/dsh/frontend/shared

import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  Badge,
  Card,
  Header,
  ScrollScreen,
  Text,
  spacing,
  colorRoles,
} from '@bthwani/ui-kit';

export type BThwaniAppearanceMode = 'lightPremium' | 'darkGlass';

export type AppearanceHubScreenProps = {
  appearanceMode?: BThwaniAppearanceMode;
  onAppearanceModeChange?: (mode: BThwaniAppearanceMode) => void;
  onBack?: () => void;
};

function AppearanceOptionRow({
  title,
  description,
  mode,
  selected,
  modeLabel,
  statusLabel,
  onPress,
}: {
  title: string;
  description: string;
  mode: BThwaniAppearanceMode;
  selected: boolean;
  modeLabel: string;
  statusLabel: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card
        style={[
          styles.optionCard,
          selected && styles.optionCardSelected,
        ]}
      >
        <View style={styles.optionRow}>
          <View style={styles.optionInfo}>
            <Text role="titleSm" style={styles.optionTitle}>{title}</Text>
            <Text role="caption" tone="muted" style={styles.optionDesc}>{description}</Text>
          </View>
          <View style={styles.optionBadges}>
            <Badge label={modeLabel} tone="info" />
            {selected && <Badge label={statusLabel} tone="success" />}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export function AppearanceHubScreen({
  appearanceMode = 'lightPremium',
  onAppearanceModeChange,
  onBack,
}: AppearanceHubScreenProps) {
  return (
    <ScrollScreen>
      <Header
        title="المظهر والسمات"
        subtitle="اختر المظهر المناسب لتجربتك"
      />

      <View style={styles.container}>
        <AppearanceOptionRow
          title="المظهر الفاتح الراقي"
          description="قاعدة بيضاء نقية مع لمسات زجاجية خفيفة وتفاصيل برتقالية ناصعة مناسبة للقراءة النهارية."
          mode="lightPremium"
          selected={appearanceMode === 'lightPremium'}
          modeLabel="Light Premium"
          statusLabel="افتراضي"
          onPress={() => onAppearanceModeChange?.('lightPremium')}
        />

        <AppearanceOptionRow
          title="الوضع الداكن الزجاجي"
          description="تأثيرات زجاجية معتمة مصممة خصيصًا لتقليل إجهاد العين ليلاً في البيئات المظلمة."
          mode="darkGlass"
          selected={appearanceMode === 'darkGlass'}
          modeLabel="Dark Glass"
          statusLabel="تأثير زجاجي"
          onPress={() => onAppearanceModeChange?.('darkGlass')}
        />
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing[4],
    gap: spacing[3],
  },
  optionCard: {
    padding: spacing[4],
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colorRoles.surfaceBase,
    backgroundColor: colorRoles.surfaceBase,
    marginBottom: spacing[3],
  },
  optionCardSelected: {
    borderColor: colorRoles.brandAction,
    backgroundColor: colorRoles.surfaceBase,
  },
  optionRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  optionInfo: {
    flex: 1,
    gap: spacing[1],
  },
  optionTitle: {
    fontWeight: '700',
    color: colorRoles.brandStructure,
    textAlign: 'right',
  },
  optionDesc: {
    color: colorRoles.brandStructure,
    textAlign: 'right',
    lineHeight: 20,
  },
  optionBadges: {
    alignItems: 'flex-end',
    gap: spacing[2],
  },
});

// export default AppearanceHubScreen; // Unused default export