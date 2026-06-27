// Authority: services/dsh/frontend/app-client — client account surface.
// Sovereign shared: services/dsh/frontend/shared

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Card,
  Header,
  ScrollScreen,
  Text,
  spacing,
} from '@bthwani/ui-kit';
import type { BThwaniAppearanceMode } from './AppearanceHubScreen';

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
  emoji: string;
};

const TABS: TabConfig[] = [
  { id: 'orders',       label: 'طلباتي',            summary: 'الطلب والتاريخ والتتبع',                     emoji: '🛍' },
  { id: 'wallet',       label: 'المحفظة',            summary: 'الرصيد، الاسترداد، وطرق الدفع',             emoji: '👛' },
  { id: 'loyalty',      label: 'النقاط والمكافآت', summary: 'الرصيد، المستوى، وأقرب ثلاث مكافآت',        emoji: '⭐' },
  { id: 'subscription', label: 'الاشتراك',           summary: 'الخطة الحالية والتبديل عند الحاجة فقط',    emoji: '💳' },
  { id: 'offers',       label: 'العروض والكوبونات', summary: 'فرص قابلة للاستخدام بدل قائمة طويلة',      emoji: '🏷' },
  { id: 'addresses',    label: 'العناوين والموقع',  summary: 'إدارة العناوين وموقع التوصيل',               emoji: '📍' },
  { id: 'identity',     label: 'الملف الشخصي',      summary: 'البيانات الشخصية والأمان',                   emoji: '👤' },
  { id: 'appearance',   label: 'المظهر',             summary: 'فاتح أبيض أو داكن زجاجي',                  emoji: '🎨' },
  { id: 'preferences',  label: 'تفضيلات التوصيل',   summary: 'إعدادات خاصة بالتسليم والاستبدال',          emoji: '⚙️' },
];

function MySpaceRow({
  title,
  summary,
  emoji,
  onPress,
}: {
  title: string;
  summary: string;
  emoji: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.rowEmoji}>
        <Text style={styles.emojiText}>{emoji}</Text>
      </View>
      <View style={styles.rowText}>
        <Text role="body" style={styles.rowTitle}>{title}</Text>
        <Text role="caption" tone="muted" style={styles.rowSummary}>{summary}</Text>
      </View>
      <Text style={styles.chevron}>‹</Text>
    </Pressable>
  );
}

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
    <ScrollScreen>
      <Header title="مساحتي" subtitle="إدارة الحساب والتفضيلات" />

      <Card style={styles.listCard}>
        {TABS.map((tab) => (
          <MySpaceRow
            key={tab.id}
            title={tab.label}
            summary={tab.summary}
            emoji={tab.emoji}
            onPress={() => handleRowPress(tab.id)}
          />
        ))}
      </Card>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  listCard: {
    margin: spacing[4],
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: spacing[3],
  },
  rowPressed: {
    backgroundColor: '#F8FAFC',
  },
  rowEmoji: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFF7F5',
    borderWidth: 1,
    borderColor: '#FDDCCA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 20,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'right',
  },
  rowSummary: {
    color: '#64748B',
    textAlign: 'right',
    fontSize: 12,
  },
  chevron: {
    fontSize: 18,
    color: '#94A3B8',
    transform: [{ scaleX: -1 }],
  },
});

export default MySpaceScreen;
