import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, StateView, Surface, Text, colorRoles, radius, spacing } from "@bthwani/ui-kit";
import type { CheckoutToOrderFlowState } from "../../shared/checkout";

export function CheckoutProgress({
  state,
  onReset,
  onCancel,
  onRefresh,
  onRetryOrder,
}: {
  readonly state: CheckoutToOrderFlowState | undefined;
  readonly onReset?: (() => void) | undefined;
  readonly onCancel?: ((intentId: string) => void) | undefined;
  readonly onRefresh?: ((intentId: string) => void) | undefined;
  readonly onRetryOrder?: (() => void) | undefined;
}) {
  if (!state || state.kind === "idle" || state.kind === "order_ready") return null;
  if (state.kind === "loading" || state.kind === "creating_order") {
    return <StateView title={state.kind === "loading" ? "جارٍ تثبيت الطلب" : "جارٍ إنشاء الطلب"} description="نثبت السعر والعنوان والدفع ثم نقرأ تفاصيل الطلب." loading />;
  }
  if (state.kind === "confirming" || state.kind === "reconciliation_pending") {
    return (
      <Surface tone="warning" style={styles.checkoutProgress}>
        <Text role="bodyStrong" style={styles.sectionTitle}>{state.kind === "confirming" ? "الدفع قيد المعالجة" : "نتحقق من نتيجة الدفع"}</Text>
        <Text role="caption" style={styles.mutedText}>لن نعيد إنشاء العملية تلقائيًا. حدّث الحالة أو ألغِ المحاولة بأمان.</Text>
        <View style={styles.progressActions}>
          <Button label="تحديث الحالة" tone="secondary" onPress={() => onRefresh?.(state.intent.id)} />
          <Button label="إلغاء والعودة للمراجعة" tone="secondary" onPress={() => onCancel?.(state.intent.id)} />
        </View>
      </Surface>
    );
  }
  if (state.kind === "checkout_action_error") {
    return (
      <Surface tone="danger" style={styles.checkoutProgress}>
        <Text role="bodyStrong" style={styles.sectionTitle}>جلسة الدفع ما تزال محفوظة</Text>
        <Text role="caption" style={styles.errorText}>{state.message}</Text>
        <View style={styles.progressActions}>
          <Button label="تحديث الحالة" tone="secondary" onPress={() => onRefresh?.(state.intent.id)} />
          <Button label="إعادة محاولة الإلغاء" tone="secondary" onPress={() => onCancel?.(state.intent.id)} />
        </View>
      </Surface>
    );
  }
  const wltUnreachableMessage =
    "خدمة الدفع غير متاحة حاليًا. لم يُنشأ طلب.";
  const message = state.kind === "blocked_payment_unavailable"
    ? wltUnreachableMessage
    : state.kind === "out_of_area"
      ? "العنوان خارج نطاق الخدمة. غيّر العنوان ثم أعد المحاولة."
      : state.kind === "terminal"
        ? "انتهت جلسة الدفع أو فشلت. راجع بيانات السلة وأنشئ محاولة جديدة."
        : state.message;
  return (
    <Surface tone="danger" style={styles.checkoutProgress}>
      <Text role="bodyStrong" style={styles.sectionTitle}>لم يكتمل تأكيد الطلب</Text>
      <Text role="caption" style={styles.errorText}>{message}</Text>
      {state.kind === "order_error" && onRetryOrder ? <Button label="إعادة المحاولة الآمنة" tone="secondary" onPress={onRetryOrder} /> : null}
      {onReset && !(state.kind === "order_error" && state.intent)
        ? <Button label="العودة إلى مراجعة السلة" tone="secondary" onPress={onReset} />
        : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: colorRoles.textPrimary, textAlign: "right" },
  checkoutProgress: {
    padding: spacing[4],
    borderRadius: radius.md,
    gap: spacing[2],
  },
  progressActions: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  mutedText: { color: colorRoles.textSecondary, textAlign: "right", lineHeight: 19 },
  errorText: { color: colorRoles.danger, textAlign: "right", lineHeight: 19 },
});
