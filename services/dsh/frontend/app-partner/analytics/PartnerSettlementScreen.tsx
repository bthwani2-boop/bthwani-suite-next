import React from "react";
import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  Card,
  Header,
  ScrollScreen,
  StateView,
  Text,
  lightThemeColors,
  spacing,
} from "@bthwani/ui-kit";
import {
  usePartnerFinanceVisibilityController,
  buildFinanceStatusLabel,
} from "../../shared/finance-visibility";

type Props = { orderId: string | null };

export function PartnerSettlementScreen({ orderId }: Props) {
  const identity = useIdentitySession();
  const { state, reload } = usePartnerFinanceVisibilityController(
    identity.state.kind,
    orderId
  );

  if (identity.state.kind !== "authenticated") {
    return <StateView title="تسجيل الدخول مطلوب" description="هذه الشاشة للشركاء فقط." />;
  }

  if (!orderId) {
    return <StateView title="حدّد طلباً" description="اختر طلباً لعرض حالة التسوية." />;
  }

  if (state.kind === "idle" || state.kind === "loading") {
    return <StateView title="جارٍ التحميل…" />;
  }

  if (state.kind === "wlt_unavailable") {
    return (
      <StateView
        title="خدمة المحفظة غير متاحة"
        description="تعذّر الوصول إلى بيانات التسوية حالياً. يرجى المحاولة لاحقاً."
        actionLabel="إعادة المحاولة"
        onActionPress={reload}
      />
    );
  }

  if (state.kind === "error") {
    return (
      <StateView
        title="تعذّر تحميل البيانات"
        description={state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={reload}
      />
    );
  }

  const { data } = state;
  const paymentLabel = buildFinanceStatusLabel(data.paymentStatus, "payment");
  const settlementLabel = buildFinanceStatusLabel(data.settlementStatus, "settlement");

  const paymentBadge = paymentLabel.badge === "error" ? "danger" : paymentLabel.badge;
  const settlementBadge = settlementLabel.badge === "error" ? "danger" : settlementLabel.badge;

  return (
    <ScrollScreen>
      <Header title="حالة التسوية" subtitle={`الطلب: ${data.orderId}`} />

      <View style={styles.notice}>
        <Text role="caption">
          هذه البيانات للعرض فقط. المصدر: خدمة WLT. لا يمكن تعديل أي قيمة مالية من هنا.
        </Text>
      </View>

      <Card style={styles.card}>
        <View style={styles.row}>
          <Text role="label">حالة الدفع</Text>
          <Badge label={paymentLabel.label} tone={paymentBadge} />
        </View>
        <View style={styles.row}>
          <Text role="label">حالة التسوية</Text>
          <Badge label={settlementLabel.label} tone={settlementBadge} />
        </View>
        {data.refundStatus && (
          <View style={styles.row}>
            <Text role="label">حالة الاسترجاع</Text>
            <Badge label={data.refundStatus} tone="neutral" />
          </View>
        )}
        <View style={styles.row}>
          <Text role="caption">آخر تحديث: {new Date(data.updatedAt).toLocaleString("ar")}</Text>
        </View>
      </Card>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  notice: {
    margin: spacing[4],
    padding: spacing[2],
    backgroundColor: lightThemeColors.warningSoft,
    borderRadius: 6,
  },
  card: { margin: spacing[4], padding: spacing[4], gap: spacing[2] },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing[1],
  },
});
