// app-field — DshFieldFinanceScreen
// Displays the authenticated field agent's own financial data from DSH.
// Never reads financial truth from WLT directly or via partnerId enumeration.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import {
  Badge,
  Button,
  StateView,
  Text,
  spacing,
  colorRoles,
  Header,
} from '@bthwani/ui-kit';
import { useFieldFinanceController } from '../../shared/finance-wlt-link/field-finance';

type DshFieldFinanceScreenProps = {
  readonly onBack: () => void;
};

function formatAmount(minorUnits: number, currency: string): string {
  return `${(minorUnits / 100).toFixed(2)} ${currency}`;
}

function commissionStatusLabel(status: string): string {
  const map: Record<string, string> = {
    earned_pending_review: 'قيد المراجعة',
    approved_pending_posting: 'معتمد - قيد الترحيل',
    posted_pending_settlement: 'مرحّل - قيد التسوية',
    held: 'محجوز',
    rejected: 'مرفوض',
    settled: 'مسوّى',
    paid: 'مدفوع',
    pending: 'قيد الانتظار',
  };
  return map[status] ?? status;
}

function commissionStatusTone(
  status: string,
): 'action' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (status === 'paid' || status === 'settled') return 'success';
  if (status === 'rejected') return 'danger';
  if (status === 'held') return 'warning';
  return 'action';
}

export function DshFieldFinanceScreen({ onBack }: DshFieldFinanceScreenProps) {
  const controller = useFieldFinanceController();
  const { state, submittingPayout, submitPayoutError, submitPayoutRequest } = controller;
  const [payoutAmountInput, setPayoutAmountInput] = useState('');

  if (state.kind === 'idle' || state.kind === 'loading') {
    return (
      <StateView
        loading
        title="جارٍ تحميل البيانات المالية"
        description="نجلب محفظتك وعمولاتك وطلبات الصرف من محرك WLT."
      />
    );
  }

  if (state.kind === 'error') {
    return (
      <StateView
        tone="danger"
        title="تعذر الوصول للبيانات المالية"
        description={state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={controller.refresh}
      />
    );
  }

  const { wallet, commissions, payoutRequests, commissionsError, payoutRequestsError } = state;

  const handleSubmitPayout = async () => {
    const amount = Number.parseFloat(payoutAmountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    const amountMinorUnits = Math.round(amount * 100);
    const ok = await submitPayoutRequest(amountMinorUnits, wallet.currency);
    if (ok) {
      setPayoutAmountInput('');
    }
  };

  return (
    <View style={styles.root}>
      <Header
        title="المحفظة والعمولات"
        subtitle="بياناتك المالية الشخصية فقط — مصدرها WLT"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Wallet Summary */}
        <View style={styles.card}>
          <Text role="titleMd" style={styles.rtl}>المحفظة</Text>
          <View style={styles.balanceRow}>
            <Text role="caption" tone="muted">متاح</Text>
            <Text role="titleLg" style={styles.positiveAmount}>
              {formatAmount(wallet.availableBalanceMinorUnits, wallet.currency)}
            </Text>
          </View>
          <View style={styles.balanceRow}>
            <Text role="caption" tone="muted">معلّق</Text>
            <Text role="bodyMd">{formatAmount(wallet.pendingBalanceMinorUnits, wallet.currency)}</Text>
          </View>
          <View style={styles.balanceRow}>
            <Text role="caption" tone="muted">محجوز</Text>
            <Text role="bodyMd">{formatAmount(wallet.heldBalanceMinorUnits, wallet.currency)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.balanceRow}>
            <Text role="caption" tone="muted">إجمالي المكتسب</Text>
            <Text role="bodyMd">{formatAmount(wallet.earnedTotalMinorUnits, wallet.currency)}</Text>
          </View>
          <View style={styles.balanceRow}>
            <Text role="caption" tone="muted">إجمالي المسوّى</Text>
            <Text role="bodyMd">{formatAmount(wallet.settledTotalMinorUnits, wallet.currency)}</Text>
          </View>
          <View style={styles.balanceRow}>
            <Text role="caption" tone="muted">إجمالي المدفوع</Text>
            <Text role="bodyMd">{formatAmount(wallet.paidTotalMinorUnits, wallet.currency)}</Text>
          </View>
        </View>

        <Button
          label="تحديث"
          tone="secondary"
          size="sm"
          onPress={controller.refresh}
        />

        {/* Payout submission */}
        <View style={styles.card}>
          <Text role="titleMd" style={styles.rtl}>طلب صرف جديد</Text>
          <Text role="caption" tone="muted" style={styles.rtl}>
            الرصيد المتاح: {formatAmount(wallet.availableBalanceMinorUnits, wallet.currency)}
          </Text>
          <TextInput
            value={payoutAmountInput}
            onChangeText={setPayoutAmountInput}
            keyboardType="decimal-pad"
            placeholder={`المبلغ (${wallet.currency})`}
            style={styles.input}
            textAlign="right"
          />
          {submitPayoutError ? (
            <Text role="caption" tone="danger" style={styles.rtl}>{submitPayoutError}</Text>
          ) : null}
          <Button
            label={submittingPayout ? 'جارٍ الإرسال...' : 'إرسال طلب الصرف'}
            tone="primary"
            disabled={submittingPayout}
            onPress={handleSubmitPayout}
          />
        </View>

        {/* Commissions */}
        <Text role="titleSm" style={styles.sectionTitle}>العمولات</Text>
        {commissionsError ? (
          <StateView tone="danger" title="تعذر تحميل العمولات" description={commissionsError} />
        ) : commissions.length === 0 ? (
          <StateView tone="neutral" title="لا توجد عمولات بعد" />
        ) : (
          commissions.map((c) => (
            <View key={c.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text role="bodyStrong">{formatAmount(c.amountMinorUnits, c.currency)}</Text>
                <Badge label={commissionStatusLabel(c.status)} tone={commissionStatusTone(c.status)} />
              </View>
              {c.sourceType ? (
                <Text role="caption" tone="muted" style={styles.rtl}>
                  المصدر: {c.sourceType}
                </Text>
              ) : null}
            </View>
          ))
        )}

        {/* Payout Requests */}
        <Text role="titleSm" style={styles.sectionTitle}>طلبات الصرف</Text>
        {payoutRequestsError ? (
          <StateView tone="danger" title="تعذر تحميل طلبات الصرف" description={payoutRequestsError} />
        ) : payoutRequests.length === 0 ? (
          <StateView tone="neutral" title="لا توجد طلبات صرف" />
        ) : (
          payoutRequests.map((p) => (
            <View key={p.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text role="bodyStrong">{formatAmount(p.amountMinorUnits, p.currency)}</Text>
                <Badge label={p.status} tone={p.status === 'completed' ? 'success' : p.status === 'failed' ? 'danger' : 'action'} />
              </View>
              <Text role="caption" tone="muted" style={styles.rtl}>{p.requestedAt}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colorRoles.surfaceBase },
  scroll: { flex: 1 },
  content: { padding: spacing[4], gap: spacing[3], paddingBottom: 96 },
  card: {
    backgroundColor: colorRoles.surfaceMuted,
    padding: spacing[4],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    gap: spacing[2],
  },
  balanceRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: { height: 1, backgroundColor: colorRoles.borderSubtle },
  input: {
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: 8,
    padding: spacing[3],
  },
  rowBetween: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  positiveAmount: { color: colorRoles.brandAction },
  rtl: { textAlign: 'right' },
  sectionTitle: { textAlign: 'right', marginTop: spacing[2] },
});