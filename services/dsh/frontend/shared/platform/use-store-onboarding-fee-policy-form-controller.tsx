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

  useEffect(() => {
    if (policyController.state.kind !== "success") return;
    setForm(buildStoreOnboardingFeePolicyForm(policyController.state.data));
  }, [policyController.state]);

  const setEnabledValue = useCallback((enabledValue: string) => {
    setForm((current) => ({ ...current, enabledValue: enabledValue as StoreOnboardingFeeEnabledValue }));
  }, []);

  const setAmount = useCallback((amount: string) => {
    setForm((current) => ({ ...current, amount }));
  }, []);

  const setCurrency = useCallback((currency: string) => {
    setForm((current) => ({ ...current, currency }));
  }, []);

  const setAppliesTo = useCallback((appliesTo: string) => {
    setForm((current) => ({ ...current, appliesTo: appliesTo as DshStoreOnboardingFeeAppliesTo }));
  }, []);

  const setChargeTiming = useCallback((chargeTiming: string) => {
    setForm((current) => ({ ...current, chargeTiming: chargeTiming as DshStoreOnboardingFeeChargeTiming }));
  }, []);

  const setNotes = useCallback((notes: string) => {
    setForm((current) => ({ ...current, notes }));
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await policyController.save(buildStoreOnboardingFeePolicyInput(form));
    } finally {
      setSaving(false);
    }
  }, [form, policyController]);

  return {
    state: policyController.state,
    reload: policyController.reload,
    form,
    saving,
    setEnabledValue,
    setAmount,
    setCurrency,
    setAppliesTo,
    setChargeTiming,
    setNotes,
    save,
  };
}
