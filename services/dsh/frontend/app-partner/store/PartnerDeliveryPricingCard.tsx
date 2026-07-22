import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, Card, Text, TextField, spacing } from "@bthwani/ui-kit";
import {
  findGovernedDeliveryPricing,
  useGovernedPartnerDeliveryPricingController,
} from "../../shared/partner";

export type PartnerDeliveryPricingCardProps = {
  readonly storeId: string;
};

function formatFee(value: number): string {
  return (value / 100).toLocaleString("ar");
}

export function PartnerDeliveryPricingCard({ storeId }: PartnerDeliveryPricingCardProps) {
  const controller = useGovernedPartnerDeliveryPricingController(storeId);
  const partnerPolicy = findGovernedDeliveryPricing(controller.records, "partner_delivery");
  const [feeYer, setFeeYer] = React.useState("");
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    setFeeYer(partnerPolicy ? String(partnerPolicy.feeMinorUnits / 100) : "");
  }, [partnerPolicy]);

  const save = React.useCallback(async () => {
    const fee = Number(feeYer);
    if (!Number.isFinite(fee) || fee < 0 || !reason.trim()) return;
    const succeeded = await controller.save(partnerPolicy, {
      feeMinorUnits: Math.round(fee * 100),
      currency: "YER",
      status: partnerPolicy?.status === "archived" ? "paused" : partnerPolicy?.status ?? "active",
      reason: reason.trim(),
    });
    if (succeeded) setReason("");
  }, [controller, feeYer, partnerPolicy, reason]);

  const canEdit = controller.state.kind === "success" || controller.state.kind === "empty";

  return (
    <Card padding={3} gap={3} tone="info">
      <Text role="bodyStrong" align="start">تسعير توصيل المتجر</Text>
      <Text role="bodySm" tone="muted" align="start">
        هذا السعر يخص وضع توصيل المتجر فقط. رسوم توصيل بثواني تحت إدارة المنصة، والاستلام من المتجر يبقى بلا رسوم.
      </Text>

      {controller.state.kind === "loading" ? <Text role="bodySm">جاري تحميل السياسة…</Text> : null}
      {controller.state.kind === "error" ? (
        <>
          <Text role="bodySm" tone="danger">{controller.state.message}</Text>
          <Button label="إعادة المحاولة" tone="secondary" onPress={() => void controller.reload()} />
        </>
      ) : null}
      {controller.state.kind === "empty" ? (
        <Text role="bodySm" tone="warning">لا توجد سياسة تسعير مهيأة. أدخل الرسوم والسبب لإنشاء سياسة توصيل المتجر.</Text>
      ) : null}

      {canEdit ? (
        <View style={styles.editor}>
          {partnerPolicy ? (
            <Text role="caption" tone="muted" align="start">
              السعر الحالي: {formatFee(partnerPolicy.feeMinorUnits)} ر.ي · الحالة: {partnerPolicy.status} · الإصدار: {partnerPolicy.version}
            </Text>
          ) : (
            <Text role="caption" tone="muted" align="start">
              ستُنشأ السياسة بحالة نشطة وبإصدار أول بعد الحفظ الناجح.
            </Text>
          )}
          <TextField
            label="رسوم توصيل المتجر بالريال اليمني"
            value={feeYer}
            onChangeText={setFeeYer}
            keyboardType="numeric"
          />
          <TextField
            label="سبب التغيير"
            value={reason}
            onChangeText={setReason}
            placeholder="مثال: تحديث تكلفة التوصيل داخل النطاق"
          />
          <Button
            label={controller.mutationLoading
              ? "جاري الحفظ…"
              : partnerPolicy
                ? "حفظ سياسة التوصيل"
                : "إنشاء سياسة التوصيل"}
            tone="brand"
            disabled={controller.mutationLoading || !feeYer.trim() || !reason.trim()}
            onPress={() => void save()}
          />
          {controller.mutationError ? <Text role="caption" tone="danger">{controller.mutationError}</Text> : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  editor: {
    gap: spacing[2],
  },
});
