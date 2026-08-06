import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  TopBar,
  StateView,
  useTheme,
  spacing,
  Box,
  Divider,
  Icon,
} from '@bthwani/ui-kit';
import { usePartnerCommercialSummaryController } from '../../shared/partner';

export type PartnerCommercialSummaryScreenProps = {
  readonly storeId: string | null;
  readonly onBack: () => void;
};

export function PartnerCommercialSummaryScreen({ storeId, onBack }: PartnerCommercialSummaryScreenProps) {
  const { state, reload } = usePartnerCommercialSummaryController(storeId);
  const theme = useTheme() as any;

  return (
    <View style={styles.root}>
      <TopBar title="النموذج التجاري" onBack={onBack} />
      {state.kind === 'loading' || state.kind === 'idle' ? (
        <StateView kind="loading" title="جاري تحميل النموذج التجاري..." />
      ) : state.kind === 'error' ? (
        <StateView kind="error" title="تعذر التحميل" description={state.message} onRetry={reload} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Box gap={spacing[4]} padding={spacing[6]} style={{ backgroundColor: theme.colors.surfaceMuted, borderRadius: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="storefront" size={24} color={theme.colors.primary} />
              <Text role="heading4">تفاصيل النموذج التجاري</Text>
            </View>
            <Divider />
            <View style={styles.row}>
              <Text role="body" style={{ color: theme.colors.textMuted }}>نوع النموذج</Text>
              <Text role="body">{state.summary.modelType}</Text>
            </View>
            <View style={styles.row}>
              <Text role="body" style={{ color: theme.colors.textMuted }}>الرسوم / النسبة</Text>
              <Text role="body">{state.summary.value} {state.summary.currency}</Text>
            </View>
            <View style={styles.row}>
              <Text role="body" style={{ color: theme.colors.textMuted }}>تاريخ البدء</Text>
              <Text role="body">{state.summary.effectiveAt ? new Date(state.summary.effectiveAt).toLocaleDateString('ar-SA') : 'غير محدد'}</Text>
            </View>
            <View style={styles.row}>
              <Text role="body" style={{ color: theme.colors.textMuted }}>تاريخ الانتهاء</Text>
              <Text role="body">{state.summary.endsAt ? new Date(state.summary.endsAt).toLocaleDateString('ar-SA') : 'مستمر'}</Text>
            </View>
          </Box>

          <Box gap={spacing[4]} padding={spacing[6]} style={{ backgroundColor: theme.colors.surfaceMuted, borderRadius: 12, marginTop: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="account_balance_wallet" size={24} color={theme.colors.primary} />
              <Text role="heading4">الملخص المالي (WLT)</Text>
            </View>
            <Divider />
            <Text role="body" style={{ color: theme.colors.textMuted, lineHeight: 22 }}>
              يتم احتساب الرسوم والعمولات وإصدار الفواتير وتسويتها من خلال النظام المالي الموحد (WLT).
              يمكنك الاطلاع على كشف الحساب التفصيلي والالتزامات من خلال المحفظة.
            </Text>
          </Box>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
});
