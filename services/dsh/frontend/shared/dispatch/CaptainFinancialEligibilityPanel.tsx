import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Badge, StateView, Text, colorRoles, spacing } from "@bthwani/ui-kit";
import type { DshCaptainFinancialEligibility } from "../platform";
import { refreshOwnCaptainFinancialEligibility } from "./captain-financial-eligibility.api";

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
      setError(cause instanceof Error ? cause.message : "تعذر التحقق من قرار الأهلية عبر WLT.");
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
        description={error ?? "لم تصل إجابة أهلية موثوقة من WLT."}
        actionLabel="إعادة التحقق"
        onActionPress={() => void refresh()}
      />
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Badge
          label={data.eligible ? "مؤهل لاستلام الطلبات" : "غير مؤهل حاليًا"}
          tone={data.eligible ? "success" : "danger"}
        />
        <Text role="titleSm" style={styles.rtl}>قرار الأهلية المالية</Text>
      </View>

      <Text role="bodySm" tone="muted" style={styles.rtl}>
        يعرض DSH قرار WLT المرجعي فقط. الرصيد والحدود والسياسة المالية لا تُنسخ إلى التطبيق ولا تُحسب محليًا.
      </Text>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text role="caption" tone="muted">رمز سبب WLT</Text>
          <Text role="bodyStrong">{data.wltReasonCode}</Text>
        </View>
        <View style={styles.metric}>
          <Text role="caption" tone="muted">نسخة السياسة</Text>
          <Text role="bodyStrong">{data.wltPolicyVersion}</Text>
        </View>
        <View style={styles.metric}>
          <Text role="caption" tone="muted">مرجع القرار</Text>
          <Text role="bodyStrong">{data.wltDecisionId}</Text>
        </View>
      </View>

      {!data.eligible && data.ineligibilityReason ? (
        <StateView tone="warning" title="سبب عدم الأهلية" description={data.ineligibilityReason} />
      ) : null}
      {error ? <StateView tone="warning" title="تعذر تحديث القراءة الأخيرة" description={error} /> : null}

      <Text role="caption" tone="muted" style={styles.rtl}>
        آخر تحقق: {new Date(data.checkedAt).toLocaleString("ar-YE")} · تقييم WLT: {new Date(data.evaluatedAt).toLocaleString("ar-YE")} · انتهاء القرار: {new Date(data.expiresAt).toLocaleString("ar-YE")}
      </Text>
      <Text role="caption" tone="muted" style={styles.rtl}>
        مرجع اللقطة: {data.snapshotReference}
      </Text>

      <Pressable
        accessibilityRole="button"
        disabled={loading}
        onPress={() => void refresh()}
        style={[styles.button, loading && styles.disabled]}
      >
        <Text role="bodyStrong" style={styles.buttonLabel}>
          {loading ? "جارٍ التحقق…" : "تحديث القرار من WLT"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing[3], padding: spacing[3], borderWidth: 1, borderColor: colorRoles.borderSubtle, borderRadius: 14, backgroundColor: colorRoles.surfaceMuted },
  header: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: spacing[2] },
  rtl: { textAlign: "right" },
  metrics: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing[2] },
  metric: { flexGrow: 1, minWidth: 120, gap: spacing[1], padding: spacing[2], borderRadius: 10, backgroundColor: colorRoles.surfaceBase },
  button: { minHeight: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colorRoles.brandAction },
  buttonLabel: { color: colorRoles.surfaceBase },
  disabled: { opacity: 0.5 },
});

export default CaptainFinancialEligibilityPanel;
