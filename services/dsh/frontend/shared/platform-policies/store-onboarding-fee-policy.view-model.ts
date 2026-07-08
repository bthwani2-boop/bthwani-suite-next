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
};

export function buildStoreOnboardingFeePolicyForm(
  policy: DshStoreOnboardingFeePolicy
): StoreOnboardingFeePolicyFormState {
  return {
    enabledValue: policy.enabled ? "true" : "false",
    amount: String(policy.amount),
    currency: policy.currency,
    appliesTo: policy.appliesTo,
    chargeTiming: policy.chargeTiming,
    notes: policy.notes,
  };
}

export function normalizeStoreOnboardingFeeAmount(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function buildStoreOnboardingFeePolicyInput(
  form: StoreOnboardingFeePolicyFormState
): DshStoreOnboardingFeePolicyInput {
  return {
    enabled: form.enabledValue === "true",
    amount: normalizeStoreOnboardingFeeAmount(form.amount),
    currency: form.currency.trim() || DEFAULT_STORE_ONBOARDING_FEE_POLICY_FORM.currency,
    appliesTo: form.appliesTo,
    chargeTiming: form.chargeTiming,
    notes: form.notes.trim(),
  };
}
