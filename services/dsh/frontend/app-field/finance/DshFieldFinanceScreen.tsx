// app-field — DshFieldFinanceScreen
// Displays the authenticated field agent's own financial data from DSH.
// Never reads financial truth from WLT directly or via partnerId enumeration.
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Badge,
  Button,
  StateView,
  Text,
  spacing,
  colorRoles,
  Header,
} from "@bthwani/ui-kit";
import { useFieldFinanceController } from "../../shared/finance-wlt-link/field-finance";
import { PayoutDestinationPanel } from "../../shared/finance-wlt-link/jrn037";

type DshFieldFinanceScreenProps = {
  readonly onBack: () => void;
};

function formatAmount(minorUnits: number, currency: string): string {
  return `${(minorUnits / 100).toFixed(2)} ${currency}`;
}

function commissionStatusLabel(status: string): string {
  const map: Record<string, string> = {
    earned_pending_review: "قيد المراجعة",
    approved_pending_posting: "معتمد - قيد الترحيل",
    posted_pending_settlement: "مرحّل - قيد التسوية",
    held: "محجوز",
    pending: "قيد المراجعة",
    confirmed: "مؤكد - قيد التسوية",
    settled: "مسوّى",
    rejected: "مرفوض",
    reversed: "معكوس",
    paid: "مدفوع",
  };
  return map[status] ?? status;
}

function commissionStatusTone(
  status: string,
): "action" | "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "paid" || status === "settled" || status === "confirmed") return "success";
  if (status === "rejected" || status === "reversed") return "danger";
  if (status === "held" || status === "pending") return "warning";
  return "action";
}

function commissionTypeLabel(type: string): string {
  const map: Record<string, string> = {
    field_visit_fee: "عمولة زيارة ميدانية",
    delivery_fee: "عمولة توصيل",
    platform_fee: "عمولة منصة",
    cod_fee: "عمولة تحصيل نقدي",
  };
  return map[type] ?? type || "عمولة تشغيلية";
}

export function DshFieldFinanceScreen({ onBack }: DshFieldFinanceScreenProps) {
  const controller = useFieldFinanceController();
  const { state } = controller;

  if (state.kind === "idle" || state.kind === "loading") {
    return (
      <StateView
        loading
        title="جارٍ تحميل البيانات المالية"
        description="نجلب محفظتك ودفتر الحركة وعمولاتك من محرك WLT."
      />
    );
  }

  if (state.kind === "error") {
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

  const { wallet, ledgerEntries, commissions, ledgerError, commissionsError } = state;

  return (
    <View style={styles.root}>
      <View style={styles.topActions}>
        <Button label="رجوع" tone="ghost" size="sm" fullWidth={false} onPress={onBack} />
      </View>
      <Header
        title="المحفظة والعمولات والصرف"
        subtitle="بياناتك المالية الشخصية فقط — مصدرها WLT"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Badge
              label={wallet.status === "active" ? "نشطة" : wallet.status}
              tone={wallet.status === "active" ? "success" : "warning"}
            />
            <Text role="titleMd" style={styles.rtl}>
              المحفظة
            </Text>
          </View>
          <View style={styles.balanceRow}>
            <Text role="caption" tone="muted">
              متاح
            </Text>
            <Text role="titleLg" style={styles.positiveAmount}>
              {formatAmount(wallet.availableBalanceMinorUnits, wallet.currency)}
            </Text>
          </View>
          <View style={styles.balanceRow}>
            <Text role="caption" tone="muted">
              معلّق
            </Text>
            <Text role="bodyMd">
              {formatAmount(wallet.pendingBalanceMinorUnits, wallet.currency)}
            </Text>
          </View>
          <View style={styles.balanceRow}>
            <Text role="caption" tone="muted">
              محجوز
            </Text>
            <Text role="bodyMd">
              {formatAmount(wallet.heldBalanceMinorUnits, wallet.currency)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.balanceRow}>
            <Text role="caption" tone="muted">
              إجمالي المكتسب
            </Text>
            <Text role="bodyMd">
              {formatAmount(wallet.earnedTotalMinorUnits, wallet.currency)}
            </Text>
          </View>
          <View style={styles.balanceRow}>
            <Text role="caption" tone="muted">
              إجمالي المسوّى
            </Text>
            <Text role="bodyMd">
              {formatAmount(wallet.settledTotalMinorUnits, wallet.currency)}
            </Text>
          </View>
          <View style={styles.balanceRow}>
            <Text role="caption" tone="muted">
              إجمالي المدفوع
            </Text>
            <Text role="bodyMd">
              {formatAmount(wallet.paidTotalMinorUnits, wallet.currency)}
            </Text>
          </View>
          <Text role="caption" tone="muted" style={styles.rtl}>
            آخر تحديث: {wallet.updatedAt ?? "غير متاح"} · آخر قيد:{" "}
            {wallet.lastLedgerEntryAt ?? "لا يوجد"}
          </Text>
        </View>

        <Button label="تحديث" tone="secondary" size="sm" onPress={controller.refresh} />

        <PayoutDestinationPanel
          actorType="field"
          currency={wallet.currency}
          title="وجهة صرف المندوب وطلبات الدفع"
          embedded
        />

        <Text role="titleSm" style={styles.sectionTitle}>
          دفتر الحركة المرجعي
        </Text>
        {ledgerError ? (
          <StateView
            tone="warning"
            title="تعذر تحميل دفتر الحركة"
            description={ledgerError}
            actionLabel="إعادة المحاولة"
            onActionPress={controller.refresh}
          />
        ) : ledgerEntries.length === 0 ? (
          <StateView tone="neutral" title="لا توجد قيود مالية بعد" />
        ) : (
          ledgerEntries.map((entry) => (
            <View key={entry.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text
                  role="bodyStrong"
                  tone={entry.debitCredit === "credit" ? "success" : "danger"}
                >
                  {entry.debitCredit === "credit" ? "+" : "-"}
                  {formatAmount(Math.abs(entry.amountMinorUnits), entry.currency)}
                </Text>
                <Text role="bodyStrong" style={styles.rtl}>
                  {entry.entryType || "قيد مالي"}
                </Text>
              </View>
              <Text role="caption" tone="muted" style={styles.rtl}>
                {entry.description || entry.sourceType || entry.referenceType}
              </Text>
              <View style={styles.rowBetween}>
                <Text role="caption" tone="muted">
                  {entry.createdAt}
                </Text>
                <Text role="caption" tone="muted">
                  الرصيد بعد القيد: {formatAmount(entry.balanceAfter, entry.currency)}
                </Text>
              </View>
            </View>
          ))
        )}

        <Text role="titleSm" style={styles.sectionTitle}>
          العمولات
        </Text>
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
            description="ستظهر العمولة بعد تحقق WLT من الدليل التشغيلي وتطبيق السياسة الفعالة."
          />
        ) : (
          commissions.map((commission) => (
            <View
              key={commission.id}
              style={styles.card}
              accessibilityLabel={`${commissionTypeLabel(commission.commissionType)} بحالة ${commissionStatusLabel(commission.status)} وقيمة ${formatAmount(commission.amountMinorUnits, commission.currency)}`}
            >
              <View style={styles.rowBetween}>
                <Text role="bodyStrong">
                  {formatAmount(commission.amountMinorUnits, commission.currency)}
                </Text>
                <Badge
                  label={commissionStatusLabel(commission.status)}
                  tone={commissionStatusTone(commission.status)}
                />
              </View>
              <Text role="bodyStrong" style={styles.rtl}>
                {commissionTypeLabel(commission.commissionType)}
              </Text>
              <Text role="caption" tone="muted" style={styles.rtl}>
                المصدر: {commission.sourceType}/{commission.sourceId}
              </Text>
              <Text role="caption" tone="muted" style={styles.rtl}>
                السياسة: {commission.commissionPolicyId ?? "غير متاحة"} · آخر تحديث:{" "}
                {commission.updatedAt || commission.createdAt}
              </Text>
              {commission.resolutionNote ? (
                <Text role="caption" tone="danger" style={styles.rtl}>
                  سبب القرار أو التعديل: {commission.resolutionNote}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colorRoles.surfaceBase },
  topActions: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    alignItems: "flex-start",
  },
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
