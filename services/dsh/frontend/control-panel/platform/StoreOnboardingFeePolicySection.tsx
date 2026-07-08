"use client";

// control-panel/platform — StoreOnboardingFeePolicySection
// Control-panel owns the policy DEFINITION only. DSH never creates a WLT
// ledger entry for this fee — WLT remains the sole owner of financial truth
// once a settlement/payment is actually recorded.
import { useState, useEffect } from "react";
import { Badge, Button, SegmentedControl, StateView, Text, TextField, spacing } from "@bthwani/ui-kit";
import { WebView as View, WebStyleSheet as StyleSheet } from "@bthwani/ui-kit/web";
import { useStoreOnboardingFeePolicyController } from "../../shared/platform-policies";
import type { DshStoreOnboardingFeeAppliesTo, DshStoreOnboardingFeeChargeTiming } from "../../shared/platform-policies";

const ENABLED_ITEMS = [
  { value: "true", label: "مفعّل" },
  { value: "false", label: "معطّل" },
] as const;

const APPLIES_TO_ITEMS: { value: DshStoreOnboardingFeeAppliesTo; label: string }[] = [
  { value: "first_store", label: "المتجر الأول فقط" },
  { value: "additional_store", label: "المتاجر الإضافية" },
  { value: "all_stores", label: "كل المتاجر" },
];

const CHARGE_TIMING_ITEMS: { value: DshStoreOnboardingFeeChargeTiming; label: string }[] = [
  { value: "on_approval", label: "عند الاعتماد" },
  { value: "on_publication", label: "عند النشر" },
  { value: "on_first_order", label: "عند أول طلب" },
  { value: "manual", label: "يدوي" },
];

export function StoreOnboardingFeePolicySection({ authKind }: { readonly authKind: string }) {
  const { state, reload, save } = useStoreOnboardingFeePolicyController(authKind);

  const [enabled, setEnabled] = useState(false);
  const [amount, setAmount] = useState("0");
  const [currency, setCurrency] = useState("YER");
  const [appliesTo, setAppliesTo] = useState<DshStoreOnboardingFeeAppliesTo>("first_store");
  const [chargeTiming, setChargeTiming] = useState<DshStoreOnboardingFeeChargeTiming>("on_approval");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (state.kind !== "success") return;
    setEnabled(state.data.enabled);
    setAmount(String(state.data.amount));
    setCurrency(state.data.currency);
    setAppliesTo(state.data.appliesTo);
    setChargeTiming(state.data.chargeTiming);
    setNotes(state.data.notes);
  }, [state]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await save({
        enabled,
        amount: Number(amount) || 0,
        currency,
        appliesTo,
        chargeTiming,
        notes,
      });
    } finally {
      setSaving(false);
    }
  };

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
            items={ENABLED_ITEMS}
            value={String(enabled)}
            onValueChange={(v) => setEnabled(v === "true")}
          />

          <TextField label="المبلغ" value={amount} onChangeText={setAmount} placeholder="0" />
          <TextField label="العملة" value={currency} onChangeText={setCurrency} placeholder="YER" />

          <Text role="bodySm">ينطبق على</Text>
          <SegmentedControl items={APPLIES_TO_ITEMS} value={appliesTo} onValueChange={(v) => setAppliesTo(v as DshStoreOnboardingFeeAppliesTo)} />

          <Text role="bodySm">توقيت التحصيل</Text>
          <SegmentedControl items={CHARGE_TIMING_ITEMS} value={chargeTiming} onValueChange={(v) => setChargeTiming(v as DshStoreOnboardingFeeChargeTiming)} />

          <TextField label="ملاحظات" value={notes} onChangeText={setNotes} placeholder="اختياري" />

          <Button label={saving ? "جارٍ الحفظ…" : "حفظ السياسة"} tone="primary" disabled={saving} onPress={() => void handleSave()} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { margin: spacing[4], gap: spacing[2] },
  form: { gap: spacing[3] },
});
