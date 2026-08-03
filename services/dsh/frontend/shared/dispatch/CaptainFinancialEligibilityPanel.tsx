import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Badge, StateView, Text, colorRoles, spacing } from "@bthwani/ui-kit";
import type { DshCaptainFinancialEligibility } from "../platform";
import { refreshOwnCaptainFinancialEligibility } from "./captain-financial-eligibility.api";

const REASON_LABELS: Readonly<Record<string, string>> = {
  WLT_DISPATCH_FINANCIALLY_ELIGIBLE: "قرار WLT يسمح باستلام الطلبات.",
  WLT_DISPATCH_POLICY_NOT_CONFIGURED: "سياسة الأهلية المالية غير مهيأة في WLT.",
  WLT_DISPATCH_FINANCIAL_POLICY_DISABLED: "سياسة الأهلية المالية متوقفة في WLT.",
  WLT_CAPTAIN_WALLET_NOT_FOUND: "لم يجد WLT محفظة مرتبطة بالكابتن.",
  WLT_WALLET_NOT_ACTIVE: "محفظة الكابتن ليست نشطة في WLT.",
  WLT_WALLET_CURRENCY_MISMATCH: "تعذر اعتماد المحفظة وفق سياسة WLT.",
  WLT_AVAILABLE_BALANCE_BELOW_REQUIRED: "قرار WLT لا يسمح بالإسناد حاليًا.",
};

function reasonLabel(reasonCode: string): string {
  return REASON_LABELS[reasonCode] ?? "قرار WLT لا يسمح بالإسناد حاليًا.";
}

export function CaptainFinancialEligibilityPanel() {
  const [data, setData] = React.useState<DshCaptainFinancialEligibility | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await refreshOwnCaptainFinancialEligibility();
      setData(result.financialEligibility);
    } catch (cause) {
      setData(null);
      setError(cause instanceof Error ? cause.message : "تعذر الحصول على قرار الأهلية من WLT.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void refresh(); }, [refresh]);

  if (loading && !data) {
    return <StateView loading title="جارٍ طلب قرار الأهلية من WLT…" />;
  }
  if (!data) {
    return (
      <StateView
        tone="danger"
        title="أهلية الإسناد غير متاحة"
        description={error ?? "لم يصل قرار صالح وغير منتهٍ من WLT."}
        actionLabel="إعادة التحقق"
        onActionPress={() => void refresh()}
      />
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Badge label={data.eligible ? "مؤهل لاستلام الطلبات" : "غير مؤهل حاليًا"} tone={data.eligible ? "success" : "danger"} />
        <Text role="titleSm" style={styles.rtl}>قرار الأهلية المالية من WLT</Text>
      </View>
      <Text role="bodySm" tone="muted" style={styles.rtl}>
        تعرض الواجهة قرار WLT فقط. لا تستقبل رصيدًا أو عملة أو حدًا ماليًا ولا تنفذ أي حساب مالي.
      </Text>
      <StateView
        tone={data.eligible ? "success" : "warning"}
        title={data.eligible ? "القرار ساري" : "الإسناد محظور"}
        description={reasonLabel(data.reasonCode)}
      />
      {error ? <StateView tone="warning" title="تعذر تحديث القرار الأخير" description={error} /> : null}
      <Text role="caption" tone="muted" style={styles.rtl}>
        إصدار السياسة: {data.policyVersion} · قيّم في {new Date(data.evaluatedAt).toLocaleString("ar-YE")} · ينتهي في {new Date(data.expiresAt).toLocaleString("ar-YE")}
      </Text>
      <Pressable accessibilityRole="button" disabled={loading} onPress={() => void refresh()} style={[styles.button, loading && styles.disabled]}>
        <Text role="bodyStrong" style={styles.buttonLabel}>{loading ? "جارٍ التحقق…" : "تحديث القرار من WLT"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing[3], padding: spacing[3], borderWidth: 1, borderColor: colorRoles.borderSubtle, borderRadius: 14, backgroundColor: colorRoles.surfaceMuted },
  header: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: spacing[2] },
  rtl: { textAlign: "right" },
  button: { minHeight: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colorRoles.brandAction },
  buttonLabel: { color: colorRoles.surfaceBase },
  disabled: { opacity: 0.5 },
});

export default CaptainFinancialEligibilityPanel;
