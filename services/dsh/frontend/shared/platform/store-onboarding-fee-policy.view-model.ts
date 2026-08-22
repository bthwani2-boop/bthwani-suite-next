import type {
  DshStoreOnboardingFeeAppliesTo,
  DshStoreOnboardingFeeChargeTiming,
  DshStoreOnboardingFeePolicy,
  DshStoreOnboardingFeePolicyInput,
} from "./platform-policies.types";

export type StoreOnboardingFeeEnabledValue = "true" | "false";

export type StoreOnboardingFeePolicyFormState = {
  readonly enabledValue: StoreOnboardingFeeEnabledValue;
  readonly amount: string;
  readonly currency: string;
  readonly appliesTo: DshStoreOnboardingFeeAppliesTo;
  readonly chargeTiming: DshStoreOnboardingFeeChargeTiming;
  readonly notes: string;
  readonly reason: string;
};

export const STORE_ONBOARDING_FEE_ENABLED_ITEMS: readonly { value: StoreOnboardingFeeEnabledValue; label: string }[] = [
  { value: "true", label: "مفعّل" },
  { value: "false", label: "معطّل" },
];

export const STORE_ONBOARDING_FEE_APPLIES_TO_ITEMS: readonly { value: DshStoreOnboardingFeeAppliesTo; label: string }[] = [
  { value: "first_store", label: "المتجر الأول فقط" },
  { value: "additional_store", label: "المتاجر الإضافية" },
  { value: "all_stores", label: "كل المتاجر" },
];

export const STORE_ONBOARDING_FEE_CHARGE_TIMING_ITEMS: readonly { value: DshStoreOnboardingFeeChargeTiming; label: string }[] = [
  { value: "on_approval", label: "عند الاعتماد" },
  { value: "on_publication", label: "عند النشر" },
  { value: "on_first_order", label: "عند أول طلب" },
  { value: "manual", label: "يدوي" },
];

export const DEFAULT_STORE_ONBOARDING_FEE_POLICY_FORM: StoreOnboardingFeePolicyFormState = {
  enabledValue: "false",
  amount: "0",
  currency: "YER",
  appliesTo: "first_store",
  chargeTiming: "on_approval",
  notes: "",
  reason: "",
};

export function buildStoreOnboardingFeePolicyForm(
  policy: DshStoreOnboardingFeePolicy,
): StoreOnboardingFeePolicyFormState {
  return {
    enabledValue: policy.enabled ? "true" : "false",
    amount: String(policy.amountMinorUnits),
    currency: policy.currency,
    appliesTo: policy.appliesTo,
    chargeTiming: policy.chargeTiming,
    notes: policy.notes,
    reason: "",
  };
}

export function normalizeStoreOnboardingFeeAmount(value: string): number {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return Number.NaN;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : Number.NaN;
}

export function buildStoreOnboardingFeePolicyInput(
  form: StoreOnboardingFeePolicyFormState,
  expectedVersion: number,
): DshStoreOnboardingFeePolicyInput {
  const amountMinorUnits = normalizeStoreOnboardingFeeAmount(form.amount);
  if (!Number.isSafeInteger(amountMinorUnits)) throw new Error("المبلغ بوحداته الصغرى غير صالح.");
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) throw new Error("نسخة السياسة غير صالحة.");
  if (form.enabledValue === "true" && amountMinorUnits <= 0) throw new Error("المبلغ يجب أن يكون أكبر من صفر عند تفعيل الرسم.");
  const currency = form.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("رمز العملة غير صالح.");
  const reason = form.reason.trim();
  if (reason.length < 3 || reason.length > 1000) throw new Error("اكتب سببًا واضحًا للتغيير.");
  const notes = form.notes.trim();
  if (notes.length > 1000) throw new Error("الملاحظات تتجاوز الحد المسموح.");
  return {
    enabled: form.enabledValue === "true",
    amountMinorUnits,
    currency,
    appliesTo: form.appliesTo,
    chargeTiming: form.chargeTiming,
    notes,
    expectedVersion,
    reason,
  };
}
