// Field onboarding controller — used by all app-field onboarding screens.
// No fetch in screens. No env in screens. All API calls here.
"use client";

import { useCallback, useState } from "react";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  fetchCreatePartner,
  fetchSubmitPartner,
  fetchUploadDocument,
  fetchCreateFieldVisit,
} from "../../../clients/partner-client";
import {
  initialDraftState,
  validateIdentityStep,
  validateOwnerStep,
  type FieldOnboardingDraftState,
  type FieldPartnerDraftStep,
  type FieldPartnerDraftForm,
  type FieldOnboardingValidationErrors,
} from "./field-onboarding.types";

export type FieldOnboardingController = {
  state: FieldOnboardingDraftState;
  validationErrors: FieldOnboardingValidationErrors;
  updateForm: (patch: Partial<FieldPartnerDraftForm>) => void;
  updateVisitNotes: (notes: string) => void;
  updateLocation: (lat: number, lon: number) => void;
  addEvidenceRef: (ref: string) => void;
  nextStep: () => Promise<void>;
  prevStep: () => void;
  submitDraft: () => Promise<void>;
  reset: () => void;
};

export function useFieldPartnerOnboardingController(): FieldOnboardingController {
  const identity = useIdentitySession();
  const token = identity.state.kind === "authenticated" ? (identity.state as { token?: string }).token ?? "" : "";

  const [state, setState] = useState<FieldOnboardingDraftState>(initialDraftState);
  const [validationErrors, setValidationErrors] = useState<FieldOnboardingValidationErrors>({});

  const updateForm = useCallback((patch: Partial<FieldPartnerDraftForm>) => {
    setState((s) => ({ ...s, form: { ...s.form, ...patch }, isDirty: true }));
  }, []);

  const updateVisitNotes = useCallback((notes: string) => {
    setState((s) => ({ ...s, visitNotes: notes, isDirty: true }));
  }, []);

  const updateLocation = useCallback((lat: number, lon: number) => {
    setState((s) => ({ ...s, locationLatitude: lat, locationLongitude: lon, isDirty: true }));
  }, []);

  const addEvidenceRef = useCallback((ref: string) => {
    setState((s) => ({ ...s, evidenceMediaRefs: [...s.evidenceMediaRefs, ref], isDirty: true }));
  }, []);

  const prevStep = useCallback(() => {
    setState((s) => {
      const steps: FieldPartnerDraftStep[] = ["identity", "owner", "store", "location", "documents", "visit-notes", "review"];
      const idx = steps.indexOf(s.step);
      if (idx > 0) return { ...s, step: steps[idx - 1]! };
      return s;
    });
  }, []);

  const nextStep = useCallback(async () => {
    const steps: FieldPartnerDraftStep[] = ["identity", "owner", "store", "location", "documents", "visit-notes", "review"];
    const currentIdx = steps.indexOf(state.step);

    // Validate current step
    if (state.step === "identity") {
      const errors = validateIdentityStep(state.form);
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        return;
      }
      setValidationErrors({});

      // Create the draft if not yet created
      if (!state.partnerId && token) {
        const form = state.form;
        const res = await fetchCreatePartner({
          legalNameAr: form.legalNameAr!,
          displayName: form.displayName!,
          primaryPhone: form.primaryPhone ?? "",
          legalIdentityType: form.legalIdentityType ?? "commercial_register",
          legalIdentityNumber: form.legalIdentityNumber!,
          legalNameEn: form.legalNameEn ?? "",
          ownerName: form.ownerName ?? "",
          secondaryPhone: form.secondaryPhone ?? "",
          email: form.email ?? "",
          category: form.category ?? "default",
          notes: form.notes ?? "",
        }, token);
        if (!res.ok) {
          setState((s) => ({ ...s, submitError: res.error.message }));
          return;
        }
        setState((s) => ({ ...s, partnerId: res.data.id, submitError: null }));
      }
    }

    if (state.step === "owner") {
      const errors = validateOwnerStep(state.form);
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        return;
      }
      setValidationErrors({});
    }

    if (currentIdx < steps.length - 1) {
      setState((s) => ({ ...s, step: steps[currentIdx + 1]! }));
    }
  }, [state, token]);

  const submitDraft = useCallback(async () => {
    if (!state.partnerId || !token) return;
    setState((s) => ({ ...s, isSubmitting: true, submitError: null }));

    // Create field visit if we have location or notes
    if (state.visitNotes || state.locationLatitude !== null) {
      await fetchCreateFieldVisit(state.partnerId, {
        visitNotes: state.visitNotes,
        locationLatitude: state.locationLatitude ?? undefined,
        locationLongitude: state.locationLongitude ?? undefined,
        evidenceMediaRefs: state.evidenceMediaRefs,
      }, token);
    }

    const res = await fetchSubmitPartner(state.partnerId, token);
    if (res.ok) {
      setState((s) => ({ ...s, isSubmitting: false, isSubmitted: true }));
    } else {
      setState((s) => ({
        ...s,
        isSubmitting: false,
        submitError:
          res.error.kind === "invalid_transition"
            ? "لا يمكن إرسال الملف في الحالة الحالية — تأكد من استكمال البيانات"
            : res.error.message,
      }));
    }
  }, [state, token]);

  const reset = useCallback(() => {
    setState(initialDraftState());
    setValidationErrors({});
  }, []);

  return {
    state,
    validationErrors,
    updateForm,
    updateVisitNotes,
    updateLocation,
    addEvidenceRef,
    nextStep,
    prevStep,
    submitDraft,
    reset,
  };
}
