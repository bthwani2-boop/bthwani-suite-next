import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, Icon, Box, Button, spacing, radius, useTheme } from '@bthwani/ui-kit';
import { ActorWalletPanel } from '../../actor-wallet';
import { RepresentativeCommissionPanel } from '../../jrn036';
import { PayoutDestinationPanel } from '../../jrn037';
import { PartnerCodCustodyPanel } from '../../wlt-cod/PartnerCodCustodyPanel';

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
}: WltDshPartnerBridgeProps) {
  const resolvedTitle = title ?? branchLabel ?? 'مالية الشريك';
  const resolvedSubtitle = subtitle ?? activeZoneLabel ?? 'المحفظة والتسويات وعهدة COD من WLT';
  const resolvedOnPress = onPress ?? onBack;
  const theme = useTheme() as any;
  const styles = React.useMemo(
    () => StyleSheet.create({
      header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[4],
        backgroundColor: theme.surfaceHighlight,
        borderRadius: radius.md,
      },
      headerPressed: {
        backgroundColor: theme.surfaceInset,
      },
      headingContent: {
        flex: 1,
        marginRight: spacing[3],
        alignItems: 'flex-end',
      },
      title: {
        color: theme.text,
        fontWeight: '700',
        fontSize: 16,
      },
      subtitle: {
        color: theme.textMuted,
        fontSize: 14,
        marginTop: 4,
        textAlign: 'right',
      },
      actions: {
        gap: spacing[3],
      },
    }),
    [theme.surfaceHighlight, theme.surfaceInset, theme.text, theme.textMuted],
  );

  return (
    <Box padding={4} gap={4}>
      {resolvedOnPress ? (
        <Pressable
          onPress={resolvedOnPress}
          style={({ pressed }: { pressed: boolean }) => [styles.header, pressed ? styles.headerPressed : null]}
        >
          <Icon name="arrow-right" tone="muted" size={20} />
          <View style={styles.headingContent}>
            <Text style={styles.title}>{resolvedTitle}</Text>
            <Text style={styles.subtitle}>{resolvedSubtitle}</Text>
          </View>
        </Pressable>
      ) : null}

      <PartnerCodCustodyPanel />
      <ActorWalletPanel actorType="partner" title="محفظة الشريك" embedded />
      <RepresentativeCommissionPanel actorType="partner" title="عمولات الشريك" embedded />
      <PayoutDestinationPanel actorType="partner" title="وجهة صرف الشريك وطلبات الدفع" embedded />

      <View style={styles.actions}>
        {onOpenExpandedWallet ? (
          <Button label="عرض المحفظة الكاملة" tone="brand" onPress={onOpenExpandedWallet} />
        ) : null}
        {onOpenSettlementReview ? (
          <Button label="مراجعة التسويات المرجعية" tone="secondary" onPress={onOpenSettlementReview} />
        ) : null}
        {onOpenFinancialReport ? (
          <Button label="التقارير المالية" tone="ghost" onPress={onOpenFinancialReport} />
        ) : null}
      </View>
    </Box>
  );
}

export default WltDshPartnerBridge;
