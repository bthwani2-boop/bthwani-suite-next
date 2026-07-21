import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_STORE_ONBOARDING_FEE_POLICY_FORM,
  buildStoreOnboardingFeePolicyForm,
  buildStoreOnboardingFeePolicyInput,
  type StoreOnboardingFeeEnabledValue,
  type StoreOnboardingFeePolicyFormState,
} from "./store-onboarding-fee-policy.view-model";
import type {
  DshStoreOnboardingFeeAppliesTo,
  DshStoreOnboardingFeeChargeTiming,
} from "./platform-policies.types";
import { useStoreOnboardingFeePolicyController } from "./use-platform-policies-controller";

export function useStoreOnboardingFeePolicyFormController(authKind: string) {
  const policyController = useStoreOnboardingFeePolicyController(authKind);
  const [form, setForm] = useState<StoreOnboardingFeePolicyFormState>(DEFAULT_STORE_ONBOARDING_FEE_POLICY_FORM);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (policyController.state.kind !== "success") return;
    setForm(buildStoreOnboardingFeePolicyForm(policyController.state.data));
    setValidationError(null);
  }, [policyController.state]);

  const setEnabledValue = useCallback((enabledValue: string) => {
    setForm((current) => ({ ...current, enabledValue: enabledValue as StoreOnboardingFeeEnabledValue }));
  }, []);
  const setAmount = useCallback((amount: string) => setForm((current) => ({ ...current, amount })), []);
  const setCurrency = useCallback((currency: string) => setForm((current) => ({ ...current, currency })), []);
  const setAppliesTo = useCallback((appliesTo: string) => {
    setForm((current) => ({ ...current, appliesTo: appliesTo as DshStoreOnboardingFeeAppliesTo }));
  }, []);
  const setChargeTiming = useCallback((chargeTiming: string) => {
    setForm((current) => ({ ...current, chargeTiming: chargeTiming as DshStoreOnboardingFeeChargeTiming }));
  }, []);
  const setNotes = useCallback((notes: string) => setForm((current) => ({ ...current, notes })), []);
  const setReason = useCallback((reason: string) => setForm((current) => ({ ...current, reason })), []);

  const save = useCallback(async () => {
    if (policyController.state.kind !== "success") {
      setValidationError("يجب تحميل السياسة الحالية قبل تعديلها.");
      return false;
    }
    setSaving(true);
    setValidationError(null);
    try {
      const input = buildStoreOnboardingFeePolicyInput(
        form,
        policyController.state.data.version,
      );
      await policyController.save(input);
      return true;
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "تعذر حفظ السياسة.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [form, policyController]);

  return {
    state: policyController.state,
    reload: policyController.reload,
    form,
    saving,
    validationError,
    setEnabledValue,
    setAmount,
    setCurrency,
    setAppliesTo,
    setChargeTiming,
    setNotes,
    setReason,
    save,
  };
}
