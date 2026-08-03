import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Badge, StateView, Text, colorRoles, spacing } from "@bthwani/ui-kit";
import type { DshCaptainFinancialEligibility } from "../platform";
import { refreshOwnCaptainFinancialEligibility } from "./captain-financial-eligibility.api";

function dateLabel(value: string): string {
  return new Date(value).toLocaleString("ar-YE");
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
      setError(cause instanceof Error ? cause.message : "تعذر التحقق من قرار الأهلية المالية عبر WLT.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void refresh(); }, [refresh]);

  if (loading && !data) {
    return <StateView loading title="جارٍ التحقق من أهلية استلام الطلبات…" />;
  }
  if (!data) {
    return (
      <StateView
        tone="danger"
        title="أهلية الإسناد غير متاحة"
        description={error ?? "لم يصل قرار أهلية صالح من WLT."}
        actionLabel="إعادة التحقق"
        onActionPress={() => void refresh()}
      />
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Badge label={data.eligible ? "مؤهل لاستلام الطلبات" : "غير مؤهل حاليًا"} tone={data.eligible ? "success" : "danger"} />
        <Text role="titleSm" style={styles.rtl}>أهلية الإسناد المالية</Text>
      </View>
      <Text role="bodySm" tone="muted" style={styles.rtl}>
        القرار والسياسة المالية مملوكان حصريًا لـWLT. تعرض DSH نتيجة القرار المجردة فقط دون رصيد أو عملة أو حدود مالية.
      </Text>
      <View style={styles.details}>
        <View style={styles.detail}>
          <Text role="caption" tone="muted">رمز القرار</Text>
          <Text role="bodyStrong" style={styles.rtl}>{data.wltReasonCode}</Text>
        </View>
        <View style={styles.detail}>
          <Text role="caption" tone="muted">إصدار السياسة</Text>
          <Text role="bodyStrong" style={styles.rtl}>{data.wltPolicyVersion}</Text>
        </View>
        <View style={styles.detail}>
          <Text role="caption" tone="muted">مرجع قرار WLT</Text>
          <Text role="bodyStrong" style={styles.rtl}>{data.wltDecisionId}</Text>
        </View>
      </View>
      {!data.eligible && data.ineligibilityReason ? (
        <StateView tone="warning" title="سبب عدم الأهلية" description={data.ineligibilityReason} />
      ) : null}
      {error ? <StateView tone="warning" title="تعذر تحديث القرار الأخير" description={error} /> : null}
      <Text role="caption" tone="muted" style={styles.rtl}>
        قُيّم في: {dateLabel(data.evaluatedAt)} · آخر مزامنة: {dateLabel(data.checkedAt)} · ينتهي في: {dateLabel(data.expiresAt)}
      </Text>
      <Pressable accessibilityRole="button" disabled={loading} onPress={() => void refresh()} style={[styles.button, loading && styles.disabled]}>
        <Text role="bodyStrong" style={styles.buttonLabel}>{loading ? "جارٍ التحقق…" : "تحديث قرار الأهلية من WLT"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing[3], padding: spacing[3], borderWidth: 1, borderColor: colorRoles.borderSubtle, borderRadius: 14, backgroundColor: colorRoles.surfaceMuted },
  header: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: spacing[2] },
  rtl: { textAlign: "right" },
  details: { gap: spacing[2] },
  detail: { gap: spacing[1], padding: spacing[2], borderRadius: 10, backgroundColor: colorRoles.surfaceBase },
  button: { minHeight: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colorRoles.brandAction },
  buttonLabel: { color: colorRoles.surfaceBase },
  disabled: { opacity: 0.5 },
});

export default CaptainFinancialEligibilityPanel;
