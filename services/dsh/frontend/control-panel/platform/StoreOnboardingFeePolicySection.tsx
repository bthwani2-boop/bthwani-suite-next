"use client";

// control-panel/platform — StoreOnboardingFeePolicySection
// Control-panel owns the policy DEFINITION only. DSH never creates a WLT
// ledger entry for this fee — WLT remains the sole owner of financial truth
// once a settlement/payment is actually recorded.
import { Badge, Button, SegmentedControl, StateView, Text, TextField, spacing } from "@bthwani/ui-kit";
import { WebView as View, WebStyleSheet as StyleSheet } from "@bthwani/ui-kit/web";
import {
  STORE_ONBOARDING_FEE_APPLIES_TO_ITEMS,
  STORE_ONBOARDING_FEE_CHARGE_TIMING_ITEMS,
  STORE_ONBOARDING_FEE_ENABLED_ITEMS,
  useStoreOnboardingFeePolicyFormController,
} from "../../shared/platform-policies";


export function StoreOnboardingFeePolicySection({ authKind }: { readonly authKind: string }) {
  const {
    state,
    reload,
    form,
    saving,
    setEnabledValue,
    setAmount,
    setCurrency,
    setAppliesTo,
    setChargeTiming,
    setNotes,
    save,
  } = useStoreOnboardingFeePolicyFormController(authKind);

  return (
    <View style={styles.section}>
      <Text role="titleSm">رسوم إضافة متجر (store_onboarding_fee_policy)</Text>
      <Text role="caption" tone="muted">
        سياسة المنصة فقط — لا يُنشئ هذا الإعداد أي حركة مالية في WLT، الحقيقة المالية تبقى لدى WLT عند التسوية الفعلية.
      </Text>

      {state.kind === "loading" && <StateView title="جارٍ التحميل…" />}
      {state.kind === "error" && (
        <StateView title="خطأ" description={state.message} actionLabel="إعادة المحاولة" onActionPress={reload} />
      )}

      {(state.kind === "success" || state.kind === "idle") && (
        <View style={styles.form}>
          {state.kind === "success" && !state.data.isConfigured && (
            <Badge label={state.data.blockedReason ?? "السياسة غير مكتملة"} tone="warning" />
          )}

          <Text role="bodySm">حالة الرسم</Text>
          <SegmentedControl
            items={STORE_ONBOARDING_FEE_ENABLED_ITEMS}
            value={form.enabledValue}
            onValueChange={setEnabledValue}
          />

          <TextField label="المبلغ" value={form.amount} onChangeText={setAmount} placeholder="0" />
          <TextField label="العملة" value={form.currency} onChangeText={setCurrency} placeholder="YER" />

          <Text role="bodySm">ينطبق على</Text>
          <SegmentedControl items={STORE_ONBOARDING_FEE_APPLIES_TO_ITEMS} value={form.appliesTo} onValueChange={setAppliesTo} />

          <Text role="bodySm">توقيت التحصيل</Text>
          <SegmentedControl items={STORE_ONBOARDING_FEE_CHARGE_TIMING_ITEMS} value={form.chargeTiming} onValueChange={setChargeTiming} />

          <TextField label="ملاحظات" value={form.notes} onChangeText={setNotes} placeholder="اختياري" />

          <Button label={saving ? "جارٍ الحفظ…" : "حفظ السياسة"} tone="primary" disabled={saving} onPress={() => void save()} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { margin: spacing[4], gap: spacing[2] },
  form: { gap: spacing[3] },
});
