import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Badge, Button, Surface, Text, colorRoles, spacing } from "@bthwani/ui-kit";
import { useWltRefundsByOrderController } from "./use-wlt-refund-controller";

export type OrderRefundStatusCardProps = {
  readonly orderId: string;
  readonly surface: "client" | "partner";
};

export function OrderRefundStatusCard({ orderId, surface }: OrderRefundStatusCardProps) {
  const { state, loadByOrder } = useWltRefundsByOrderController(surface);

  useEffect(() => {
    void loadByOrder(orderId);
  }, [loadByOrder, orderId]);

  if (state.kind === "idle" || state.kind === "loading") {
    return (
      <View
        accessibilityRole="progressbar"
        accessibilityLiveRegion="polite"
        accessibilityLabel="جارٍ تحميل حالة الاسترداد"
      >
        <Surface style={styles.card}>
          <Text role="bodySm" tone="muted">جارٍ التحقق من حالة الاسترداد المالية…</Text>
        </Surface>
      </View>
    );
  }

  if (state.kind === "error") {
    return (
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
        accessibilityLabel={`تعذر تحديث حالة الاسترداد: ${state.message}`}
      >
        <Surface style={[styles.card, styles.errorCard]}>
          <Text role="bodyStrong">تعذر تحديث حالة الاسترداد</Text>
          <Text role="bodySm" tone="muted">{state.message}</Text>
          <Button label="إعادة المحاولة" tone="secondary" size="sm" onPress={() => void loadByOrder(orderId)} />
        </Surface>
      </View>
    );
  }

  if (state.refunds.length === 0) return null;

  const hasProviderUnknown = state.refunds.some((refund) => refund.status === "provider_unknown");

  return (
    <Surface style={styles.card} accessibilityLabel={`حالة استردادات الطلب، العدد ${state.refunds.length}`}>
      <View style={styles.header}>
        <Text role="bodyStrong">الاسترداد المالي</Text>
        <Text role="caption" tone="muted">الحالة من WLT</Text>
      </View>
      {state.refunds.map((refund) => (
        <View
          key={refund.id}
          style={styles.row}
          accessible
          accessibilityLabel={`${refund.amountLabel} ${refund.currency}، ${refund.statusLabel}`}
        >
          <View style={styles.amountBlock}>
            <Text role="bodyStrong">{refund.amountLabel} {refund.currency}</Text>
            <Text role="caption" tone="muted">{refund.resolvedAt ? `حُسم: ${refund.resolvedAt}` : "لم يُحسم بعد"}</Text>
          </View>
          <Badge
            label={refund.statusLabel}
            tone={refund.statusBadge === "error" ? "danger" : refund.statusBadge}
          />
        </View>
      ))}
      {hasProviderUnknown ? (
        <View accessibilityRole="alert" accessibilityLiveRegion="assertive">
          <Text role="bodySm" style={styles.warningText}>
            نتيجة المزود غير محسومة. لا يعني ذلك نجاحًا أو فشلًا حتى تنتهي المصالحة المالية.
          </Text>
        </View>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing[3],
    gap: spacing[2],
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    backgroundColor: colorRoles.surfaceBase,
    marginTop: spacing[3],
  },
  errorCard: { borderColor: colorRoles.danger },
  header: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  row: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  amountBlock: { flex: 1, alignItems: "flex-end", gap: 2 },
  warningText: { color: colorRoles.warning, textAlign: "right" },
});
