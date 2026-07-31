import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Badge, StateView, Text, colorRoles, spacing } from "@bthwani/ui-kit";
import type { DshCaptainFinancialEligibility } from "../platform";
import { refreshOwnCaptainFinancialEligibility } from "./captain-financial-eligibility.api";

function amountLabel(minorUnits: number, currency: string): string {
  return `${(minorUnits / 100).toLocaleString("ar-YE", { maximumFractionDigits: 2 })} ${currency}`;
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
      setError(cause instanceof Error ? cause.message : "تعذر التحقق من الضمانة المالية عبر WLT.");
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
        description={error ?? "لم تصل قراءة محفظة صالحة من WLT."}
        actionLabel="إعادة التحقق"
        onActionPress={() => void refresh()}
      />
    );
  }

  const deficit = Math.max(0, data.minimumDispatchBalanceMinorUnits - data.availableBalanceMinorUnits);
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Badge label={data.eligible ? "مؤهل لاستلام الطلبات" : "غير مؤهل حاليًا"} tone={data.eligible ? "success" : "danger"} />
        <Text role="titleSm" style={styles.rtl}>الضمانة المالية وأهلية الإسناد</Text>
      </View>
      <Text role="bodySm" tone="muted" style={styles.rtl}>
        الرصيد من WLT، والحد التشغيلي من سياسة المنصة. لا يمكن للتطبيق تعديل أي منهما.
      </Text>
      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text role="caption" tone="muted">الرصيد المتاح</Text>
          <Text role="bodyStrong">{amountLabel(data.availableBalanceMinorUnits, data.currency)}</Text>
        </View>
        <View style={styles.metric}>
          <Text role="caption" tone="muted">الحد المطلوب</Text>
          <Text role="bodyStrong">{amountLabel(data.minimumDispatchBalanceMinorUnits, data.currency)}</Text>
        </View>
        <View style={styles.metric}>
          <Text role="caption" tone="muted">المبلغ الناقص</Text>
          <Text role="bodyStrong" tone={deficit > 0 ? "danger" : "success"}>{amountLabel(deficit, data.currency)}</Text>
        </View>
      </View>
      {!data.eligible && data.ineligibilityReason ? (
        <StateView tone="warning" title="سبب الحظر" description={data.ineligibilityReason} />
      ) : null}
      {error ? <StateView tone="warning" title="تعذر تحديث القراءة الأخيرة" description={error} /> : null}
      <Text role="caption" tone="muted" style={styles.rtl}>
        آخر تحقق: {new Date(data.checkedAt).toLocaleString("ar-YE")} · تنتهي اللقطة: {new Date(data.expiresAt).toLocaleString("ar-YE")}
      </Text>
      <Pressable accessibilityRole="button" disabled={loading} onPress={() => void refresh()} style={[styles.button, loading && styles.disabled]}>
        <Text role="bodyStrong" style={styles.buttonLabel}>{loading ? "جارٍ التحقق…" : "تحديث الأهلية من WLT"}</Text>
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
