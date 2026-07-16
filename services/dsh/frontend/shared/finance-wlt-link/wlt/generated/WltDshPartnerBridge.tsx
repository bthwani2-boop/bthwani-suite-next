import React, { useEffect } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { Text, Icon, Box, StateView, Button, spacing, radius, useTheme } from '@bthwani/ui-kit';
import { useWltSettlementSummaryController } from '../../wlt-settlement/use-wlt-settlement-controller';
export type WltDshPartnerBridgeProps = {
  readonly title?: string | undefined;
  readonly subtitle?: string | undefined;
  readonly onPress?: (() => void) | undefined;
  readonly branchLabel?: string | undefined;
  readonly activeZoneLabel?: string | undefined;
  readonly serviceModes?: readonly { id: string; label: string; description: string; enabled: boolean }[] | undefined;
  readonly onBack?: (() => void) | undefined;
  readonly onOpenExpandedWallet?: (() => void) | undefined;
  readonly onOpenSettlementReview?: (() => void) | undefined;
  readonly onOpenFinancialReport?: (() => void) | undefined;
  readonly dshClientId?: string | null | undefined;
  readonly canonicalStoreId?: string | undefined;
};

export function WltDshPartnerBridge({
  title,
  subtitle,
  onPress,
  branchLabel,
  activeZoneLabel,
  onBack,
  onOpenExpandedWallet,
  onOpenSettlementReview,
  onOpenFinancialReport,
  canonicalStoreId,
}: WltDshPartnerBridgeProps) {
  const resolvedTitle = title ?? branchLabel;
  const resolvedSubtitle = subtitle ?? activeZoneLabel;
  const resolvedOnPress = onPress ?? onBack;
  const theme = useTheme() as any;

  const partnerId = canonicalStoreId ?? 'partner_123';
  
  const { state, loadSummary, reset } = useWltSettlementSummaryController();

  useEffect(() => {
    loadSummary(partnerId);
    return () => reset();
  }, [loadSummary, reset, partnerId]);

  return (
    <Box padding={4} gap={4}>
      <Pressable
        onPress={resolvedOnPress}
        style={({ pressed }: { pressed: boolean }) => ({
          flexDirection: 'row-reverse',
          alignItems: 'center',
          paddingVertical: spacing[3],
          paddingHorizontal: spacing[4],
          backgroundColor: pressed ? theme.surfaceInset : theme.surfaceHighlight,
          borderRadius: radius.md,
          marginBottom: spacing[4],
        })}
      >
        <Icon name="arrow-right" tone="muted" size={20} />
        <View style={{ flex: 1, marginRight: spacing[3] }}>
          {resolvedTitle && <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>{resolvedTitle}</Text>}
          {resolvedSubtitle && <Text style={{ color: theme.textMuted, fontSize: 14, marginTop: 4 }}>{resolvedSubtitle}</Text>}
        </View>
      </Pressable>

      <Box style={{ backgroundColor: theme.surfaceInset, borderRadius: radius.lg, padding: spacing[4] }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: spacing[4] }}>محفظة الشريك</Text>
        
        {state.kind === 'loading' && (
          <Box padding={4} align="center">
            <ActivityIndicator color={theme.brand} />
          </Box>
        )}
        
        {state.kind === 'error' && (
          <StateView
            title="تعذر تحميل بيانات المحفظة"
            description={state.message}
            tone="danger"
            actionLabel="إعادة المحاولة"
            onActionPress={() => loadSummary(partnerId)}
          />
        )}

        {state.kind === 'loaded' && (
          <View>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: spacing[4] }}>
              <View>
                <Text style={{ fontSize: 14, color: theme.textMuted }}>الرصيد المتاح</Text>
                <Text style={{ fontSize: 24, fontWeight: '700', color: theme.success }}>
                  {state.summary.pendingAmountLabel} {state.summary.currency}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 14, color: theme.textMuted }}>إجمالي المسويات</Text>
                <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text }}>
                  {state.summary.totalSettledLabel} {state.summary.currency}
                </Text>
              </View>
            </View>

            <View style={{ gap: spacing[3] }}>
              {onOpenExpandedWallet && (
                <Button label="عرض المحفظة الكاملة" tone="brand" onPress={onOpenExpandedWallet} />
              )}
              {onOpenSettlementReview && (
                <Button label="مراجعة المسويات" tone="secondary" onPress={onOpenSettlementReview} />
              )}
              {onOpenFinancialReport && (
                <Button label="التقارير المالية" tone="ghost" onPress={onOpenFinancialReport} />
              )}
            </View>
          </View>
        )}
      </Box>
    </Box>
  );
}
