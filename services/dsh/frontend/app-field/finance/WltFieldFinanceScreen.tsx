// app-field — WltFieldFinanceScreen
// Displays the authenticated field provider's own financial data.
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Badge,
  Button,
  Card,
  StateView,
  Text,
  spacing,
  colorRoles,
  Header,
  formatDateTime,
} from "@bthwani/ui-kit";
import { formatWltMoney } from '@bthwani/dsh/finance';
import { useFieldFinanceController } from '@bthwani/dsh/wlt-boundary';
import { classifyGovernedError } from '../../shared/_kernel/governed-problem';
import { DshFieldProblemState } from '../components/DshFieldProblemNotice';
import {
  PayoutDestinationPanel,
  commissionStatusLabel,
  commissionStatusTone,
  commissionTypeLabel,
  walletStatusLabel
} from '@bthwani/dsh/wlt-boundary';
import { DshFieldReferenceTag } from "../../../../dsh/frontend/app-field/components/DshFieldReferenceTag";

type WltFieldFinanceScreenProps = {
  readonly onBack: () => void;
};



export function WltFieldFinanceScreen({ onBack }: WltFieldFinanceScreenProps) {
  const controller = useFieldFinanceController();
  const { state } = controller;

  if (state.kind === "idle" || state.kind === "loading") {
    return (
      <StateView
        loading
        title="جارٍ تحميل البيانات المالية"
        description="نجلب محفظتك وحركاتك وعمولاتك."
      />
    );
  }

  if (state.kind === "error") {
    // WLT emits the reason code; this surface maps it to the governed
    // presentation so financial failures read like every other refusal.
    const problem = classifyGovernedError({ code: state.code, message: state.message });
    return (
      <DshFieldProblemState
        problem={problem}
        handlers={{
          refresh_record: controller.refresh,
          refresh_scope: controller.refresh,
        }}
        onRetry={controller.refresh}
      />
    );
  }

  const { wallet, ledgerEntries, commissions, ledgerError, commissionsError } = state;

  return (
    <View style={styles.root}>
      <Header
        title="المحفظة والعمولات والصرف"
        subtitle="بياناتك المالية الشخصية فقط"
        onBack={onBack}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <View style={styles.rowBetween}>
            <Badge
              label={walletStatusLabel(wallet.status)}
              tone={wallet.status === "active" ? "success" : "warning"}
            />
            <Text role="titleMd" style={styles.rtl}>المحفظة</Text>
          </View>
          <View style={styles.balanceRow}>
            <Text role="caption" tone="muted">متاح</Text>
            <Text role="titleLg" style={styles.positiveAmount}>{formatWltMoney(wallet.availableBalanceMinorUnits, wallet.currency)}</Text>
          </View>
          <View style={styles.balanceRow}>
            <Text role="caption" tone="muted">معلّق</Text>
            <Text role="bodyMd">{formatWltMoney(wallet.pendingBalanceMinorUnits, wallet.currency)}</Text>
          </View>
          <View style={styles.balanceRow}>
            <Text role="caption" tone="muted">محجوز</Text>
            <Text role="bodyMd">{formatWltMoney(wallet.heldBalanceMinorUnits, wallet.currency)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.balanceRow}>
            <Text role="caption" tone="muted">إجمالي المكتسب</Text>
            <Text role="bodyMd">{formatWltMoney(wallet.earnedTotalMinorUnits, wallet.currency)}</Text>
          </View>
          <View style={styles.balanceRow}>
            <Text role="caption" tone="muted">إجمالي المسوّى</Text>
            <Text role="bodyMd">{formatWltMoney(wallet.settledTotalMinorUnits, wallet.currency)}</Text>
          </View>
          <View style={styles.balanceRow}>
            <Text role="caption" tone="muted">إجمالي المدفوع</Text>
            <Text role="bodyMd">{formatWltMoney(wallet.paidTotalMinorUnits, wallet.currency)}</Text>
          </View>
          <Text role="caption" tone="muted" style={styles.rtl}>
            {wallet.updatedAt ? `آخر تحديث: ${formatDateTime(wallet.updatedAt)}` : ""}
            {wallet.lastLedgerEntryAt ? ` · آخر حركة: ${formatDateTime(wallet.lastLedgerEntryAt)}` : ""}
          </Text>
        </Card>

        <Button label="تحديث" tone="secondary" size="sm" onPress={controller.refresh} />

        <PayoutDestinationPanel
          actorType="field"
          currency={wallet.currency}
          title="وجهة صرف الميداني وطلبات الدفع"
          embedded
        />

        <Text role="titleSm" style={styles.sectionTitle}>سجل الحركات</Text>
        {ledgerError ? (
          <StateView
            tone="warning"
            title="تعذر تحميل سجل الحركات"
            description={ledgerError}
            actionLabel="إعادة المحاولة"
            onActionPress={controller.refresh}
          />
        ) : ledgerEntries.length === 0 ? (
          <StateView tone="neutral" title="لا توجد قيود مالية بعد" />
        ) : (
          ledgerEntries.map((entry) => (
            <Card key={entry.id}>
              <View style={styles.rowBetween}>
                <Text role="bodyStrong" tone={entry.debitCredit === "credit" ? "success" : "danger"}>
                  {entry.debitCredit === "credit" ? "+" : "-"}{formatWltMoney(Math.abs(entry.amountMinorUnits), entry.currency)}
                </Text>
                <Text role="bodyStrong" style={styles.rtl}>{entry.entryType || "قيد مالي"}</Text>
              </View>
              {entry.description ? (
                <Text role="caption" tone="muted" style={styles.rtl}>{entry.description}</Text>
              ) : null}
              <View style={styles.rowBetween}>
                <Text role="caption" tone="muted">{formatDateTime(entry.createdAt)}</Text>
                <Text role="caption" tone="muted">الرصيد بعد القيد: {formatWltMoney(entry.balanceAfter, entry.currency)}</Text>
              </View>
            </Card>
          ))
        )}

        <Text role="titleSm" style={styles.sectionTitle}>العمولات</Text>
        {commissionsError ? (
          <StateView
            tone="danger"
            title="تعذر تحميل العمولات"
            description={commissionsError}
            actionLabel="إعادة المحاولة"
            onActionPress={controller.refresh}
          />
        ) : commissions.length === 0 ? (
          <StateView
            tone="neutral"
            title="لا توجد عمولات بعد"
            description="ستظهر العمولة بعد التحقق من الدليل التشغيلي وتطبيق السياسة الفعالة."
          />
        ) : (
          commissions.map((commission) => (
            <Card
              key={commission.id}
              accessibilityLabel={`${commissionTypeLabel(commission.commissionType)} بحالة ${commissionStatusLabel(commission.status)} وقيمة ${formatWltMoney(commission.amountMinorUnits, commission.currency)}`}
            >
              <View style={styles.rowBetween}>
                <Text role="bodyStrong">{formatWltMoney(commission.amountMinorUnits, commission.currency)}</Text>
                <Badge label={commissionStatusLabel(commission.status)} tone={commissionStatusTone(commission.status)} />
              </View>
              <Text role="bodyStrong" style={styles.rtl}>{commissionTypeLabel(commission.commissionType)}</Text>
              <Text role="caption" tone="muted" style={styles.rtl}>
                آخر تحديث: {formatDateTime(commission.updatedAt || commission.createdAt)}
              </Text>
              {commission.resolutionNote ? (
                <Text role="caption" tone="danger" style={styles.rtl}>سبب القرار أو التعديل: {commission.resolutionNote}</Text>
              ) : null}
              <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing[1] }}>
                <DshFieldReferenceTag label="رقم المصدر" value={commission.sourceId} />
                {commission.commissionPolicyId ? (
                  <DshFieldReferenceTag label="رقم السياسة" value={commission.commissionPolicyId} />
                ) : null}
              </View>
            </Card>
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
  balanceRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  divider: { height: 1, backgroundColor: colorRoles.borderSubtle },
  rowBetween: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[2],
  },
  positiveAmount: { color: colorRoles.brandAction },
  rtl: { textAlign: "right" },
  sectionTitle: { textAlign: "right", marginTop: spacing[2] },
});
