"use client";

// Control-panel owns the policy definition only. DSH never creates a WLT
// ledger entry for this fee; WLT remains the sole financial truth owner.
import { SegmentedControl, Text, spacing } from "@bthwani/ui-kit";
import {
  WebStyleSheet as StyleSheet,
  WebView as View,
} from "@bthwani/ui-kit/web";
import {
  CpBadge,
  CpButton,
  CpRetryButton,
  CpStatePanel,
  CpTextInput,
} from "@bthwani/control-panel/components";
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
        <CpStatePanel role="status" title="جارٍ تحميل السياسة…" />
      ) : null}
      {controller.state.kind === "error" ? (
        <CpStatePanel role="alert" title="تعذر تحميل السياسة" description={controller.state.message}>
          <CpRetryButton onClick={controller.reload}>إعادة المحاولة</CpRetryButton>
        </CpStatePanel>
      ) : null}

      {controller.state.kind === "success" ? (
        <View style={styles.form}>
          <View style={styles.badges}>
            <CpBadge tone="info">{`الإصدار ${controller.state.data.version}`}</CpBadge>
            <CpBadge tone={controller.state.data.isConfigured ? "success" : "warning"}>
              {controller.state.data.isConfigured
                ? "سياسة مكتملة"
                : controller.state.data.blockedReason ?? "السياسة غير مكتملة"}
            </CpBadge>
          </View>

          <Text role="bodySm">حالة الرسم</Text>
          {/* SegmentedControl kept: no Cp equivalent for a settings toggle control (CpTabs is for navigation tabs) */}
          <SegmentedControl
            items={STORE_ONBOARDING_FEE_ENABLED_ITEMS}
            value={controller.form.enabledValue}
            onValueChange={controller.setEnabledValue}
          />

          <CpTextInput
            aria-label="المبلغ"
            value={controller.form.amount}
            onChange={controller.setAmount}
            placeholder="0"
          />
          <CpTextInput
            aria-label="العملة"
            value={controller.form.currency}
            onChange={controller.setCurrency}
            placeholder="YER"
          />

          <Text role="bodySm">ينطبق على</Text>
          {/* SegmentedControl kept: no Cp equivalent for a settings toggle control (CpTabs is for navigation tabs) */}
          <SegmentedControl
            items={STORE_ONBOARDING_FEE_APPLIES_TO_ITEMS}
            value={controller.form.appliesTo}
            onValueChange={controller.setAppliesTo}
          />

          <Text role="bodySm">توقيت التحصيل</Text>
          {/* SegmentedControl kept: no Cp equivalent for a settings toggle control (CpTabs is for navigation tabs) */}
          <SegmentedControl
            items={STORE_ONBOARDING_FEE_CHARGE_TIMING_ITEMS}
            value={controller.form.chargeTiming}
            onValueChange={controller.setChargeTiming}
          />

          <CpTextInput
            aria-label="ملاحظات"
            value={controller.form.notes}
            onChange={controller.setNotes}
            placeholder="اختياري"
          />
          <CpTextInput
            aria-label="سبب التغيير"
            value={controller.form.reason}
            onChange={controller.setReason}
            placeholder="سبب تشغيلي قابل للتدقيق"
          />

          {controller.validationError ? (
            <Text tone="danger">{controller.validationError}</Text>
          ) : null}

          <CpButton
            variant="primary"
            disabled={controller.saving}
            onClick={() => void controller.save()}
          >
            {controller.saving ? "جارٍ الحفظ…" : "حفظ السياسة"}
          </CpButton>
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
