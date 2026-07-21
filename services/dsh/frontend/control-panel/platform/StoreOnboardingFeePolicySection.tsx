"use client";

// Control-panel owns the policy definition only. DSH never creates a WLT
// ledger entry for this fee; WLT remains the sole financial truth owner.
import {
  Badge,
  Button,
  SegmentedControl,
  StateView,
  Text,
  TextField,
  spacing,
} from "@bthwani/ui-kit";
import {
  WebStyleSheet as StyleSheet,
  WebView as View,
} from "@bthwani/ui-kit/web";
import {
  STORE_ONBOARDING_FEE_APPLIES_TO_ITEMS,
  STORE_ONBOARDING_FEE_CHARGE_TIMING_ITEMS,
  STORE_ONBOARDING_FEE_ENABLED_ITEMS,
  useStoreOnboardingFeePolicyFormController,
} from "../../shared/platform";

export function StoreOnboardingFeePolicySection({
  authKind,
}: {
  readonly authKind: string;
}) {
  const controller = useStoreOnboardingFeePolicyFormController(authKind);

  return (
    <View style={styles.section}>
      <Text role="titleSm">سياسة رسوم تهيئة المتجر</Text>
      <Text role="caption" tone="muted">
        تعريف تشغيلي داخل DSH فقط. لا ينشئ هذا الإعداد رصيدًا أو قيدًا ماليًا؛
        الحقيقة المالية الفعلية تبقى داخل WLT.
      </Text>

      {controller.state.kind === "loading" ? (
        <StateView title="جارٍ تحميل السياسة…" />
      ) : null}
      {controller.state.kind === "error" ? (
        <StateView
          title="تعذر تحميل السياسة"
          description={controller.state.message}
          actionLabel="إعادة المحاولة"
          onActionPress={controller.reload}
        />
      ) : null}

      {controller.state.kind === "success" ? (
        <View style={styles.form}>
          <View style={styles.badges}>
            <Badge
              label={`الإصدار ${controller.state.data.version}`}
              tone="info"
            />
            <Badge
              label={
                controller.state.data.isConfigured
                  ? "سياسة مكتملة"
                  : controller.state.data.blockedReason ?? "السياسة غير مكتملة"
              }
              tone={
                controller.state.data.isConfigured ? "success" : "warning"
              }
            />
          </View>

          <Text role="bodySm">حالة الرسم</Text>
          <SegmentedControl
            items={STORE_ONBOARDING_FEE_ENABLED_ITEMS}
            value={controller.form.enabledValue}
            onValueChange={controller.setEnabledValue}
          />

          <TextField
            label="المبلغ"
            value={controller.form.amount}
            onChangeText={controller.setAmount}
            placeholder="0"
            keyboardType="numeric"
          />
          <TextField
            label="العملة"
            value={controller.form.currency}
            onChangeText={controller.setCurrency}
            placeholder="YER"
          />

          <Text role="bodySm">ينطبق على</Text>
          <SegmentedControl
            items={STORE_ONBOARDING_FEE_APPLIES_TO_ITEMS}
            value={controller.form.appliesTo}
            onValueChange={controller.setAppliesTo}
          />

          <Text role="bodySm">توقيت التحصيل</Text>
          <SegmentedControl
            items={STORE_ONBOARDING_FEE_CHARGE_TIMING_ITEMS}
            value={controller.form.chargeTiming}
            onValueChange={controller.setChargeTiming}
          />

          <TextField
            label="ملاحظات"
            value={controller.form.notes}
            onChangeText={controller.setNotes}
            placeholder="اختياري"
          />
          <TextField
            label="سبب التغيير"
            value={controller.form.reason}
            onChangeText={controller.setReason}
            placeholder="سبب تشغيلي قابل للتدقيق"
          />

          {controller.validationError ? (
            <Text tone="danger">{controller.validationError}</Text>
          ) : null}

          <Button
            label={controller.saving ? "جارٍ الحفظ…" : "حفظ السياسة"}
            tone="primary"
            disabled={controller.saving}
            onPress={() => void controller.save()}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { margin: spacing[4], gap: spacing[2] },
  form: { gap: spacing[3] },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
});
