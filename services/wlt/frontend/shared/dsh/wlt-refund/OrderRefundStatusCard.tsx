import React from "react";
import { StyleSheet, View } from "react-native";
import { Badge, Button, Surface, Text, colorRoles, spacing } from "@bthwani/ui-kit";
import { usePartnerOrderRefundsQuery, useClientOrderRefundsQuery } from "./wlt-refund.queries";
import type { WltRefundResponse } from "./wlt-refund.queries";

export type OrderRefundStatusCardProps = {
  readonly orderId: string;
  readonly surface: "client" | "partner";
};

function refundBadgeTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "completed") return "success";
  if (status === "rejected" || status === "reversed") return "danger";
  if (status === "approved" || status === "processing" || status === "provider_unknown") return "warning";
  return "neutral";
}

function refundLabel(status: string): string {
  switch (status) {
    case "requested": return "بانتظار المراجعة";
    case "approved": return "معتمد";
    case "processing": return "قيد التنفيذ لدى المزود";
    case "provider_unknown": return "نتيجة غير محسومة";
    case "completed": return "مسترد";
    case "rejected": return "مرفوض";
    case "reversed": return "معكوس";
    default: return status;
  }
}

export function OrderRefundStatusCard({ orderId, surface }: OrderRefundStatusCardProps) {
  const partnerQuery = usePartnerOrderRefundsQuery(orderId, surface === "partner");
  const clientQuery = useClientOrderRefundsQuery(orderId, surface === "client");

  const query = surface === "client" ? clientQuery : partnerQuery;
  const refunds: readonly WltRefundResponse[] = query.data ?? [];

  if (query.isPending) {
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

  if (query.isError) {
    return (
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
        accessibilityLabel="تعذر تحديث حالة الاسترداد"
      >
        <Surface style={[styles.card, styles.errorCard]}>
          <Text role="bodyStrong">تعذر تحديث حالة الاسترداد</Text>
          <Text role="bodySm" tone="muted">تعذر الاتصال بخدمة WLT المالية.</Text>
          <Button label="إعادة المحاولة" tone="secondary" size="sm" onPress={() => void query.refetch()} />
        </Surface>
      </View>
    );
  }

  if (refunds.length === 0) return null;

  const hasProviderUnknown = refunds.some((r) => r.status === "provider_unknown");

  return (
    <Surface style={styles.card} accessibilityLabel={`حالة استردادات الطلب، العدد ${refunds.length}`}>
      <View style={styles.header}>
        <Text role="bodyStrong">الاسترداد المالي</Text>
        <Text role="caption" tone="muted">الحالة من WLT</Text>
      </View>
      {refunds.map((refund) => (
        <View
          key={refund.id}
          style={styles.row}
          accessible
          accessibilityLabel={`${refund.amountMinorUnits} ${refund.currency}، ${refundLabel(refund.status)}`}
        >
          <View style={styles.amountBlock}>
            <Text role="bodyStrong">{refund.amountMinorUnits} {refund.currency}</Text>
            <Text role="caption" tone="muted">
              {refund.resolvedAt ? `حُسم: ${refund.resolvedAt}` : "لم يُحسم بعد"}
            </Text>
          </View>
          <Badge label={refundLabel(refund.status)} tone={refundBadgeTone(refund.status)} />
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
