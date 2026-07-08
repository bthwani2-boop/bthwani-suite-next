// Field onboarding controller — used by all app-field onboarding screens.
// No fetch in screens. No env in screens. All API calls here.
"use client";

import { useCallback, useState } from "react";
import {
  fieldCreateDraft,
  fieldUpdatePartner,
  fieldUpdatePartnerStore,
  fieldSubmitPartner,
  fieldUploadDocument,
  fieldCreateVisit,
  type DshPartnerDocumentType,
} from "../partner";
import {
  initialDraftState,
  validateIdentityStep,
  validateOwnerStep,
  FIELD_ONBOARDING_STEPS,
  type FieldOnboardingDraftState,
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
  /** Validates the identity step and creates the partner draft if it doesn't exist yet. Returns false if blocked. */
  ensureDraftCreated: () => Promise<boolean>;
  uploadDocument: (kind: DshPartnerDocumentType, mediaRef: string) => Promise<boolean>;
  nextStep: () => Promise<void>;
  prevStep: () => void;
  submitDraft: () => Promise<void>;
  reset: () => void;
};

function buildStoreDraftInput(form: Partial<FieldPartnerDraftForm>) {
  return {
    displayName: form.displayName ?? "",
    cityCode: form.city ?? "",
    serviceAreaCode: form.serviceAreaCode ?? form.city ?? "",
    addressLine: form.addressLine ?? "",
    coverageSummary: form.coverageSummary ?? "",
    operatingHours: form.operatingHours ?? "",
    deliveryReadiness: form.deliveryReadiness ?? "",
    storefrontPhotoRef: form.storefrontPhotoRef ?? "",
    interiorPhotoRef: form.interiorPhotoRef ?? "",
    signagePhotoRef: form.signagePhotoRef ?? "",
  };
}

function buildBankAccountInput(form: Partial<FieldPartnerDraftForm>) {
  return {
    beneficiaryName: form.beneficiaryName ?? "",
    bankName: form.bankName ?? "",
    bankBranch: form.bankBranch ?? "",
    accountNumber: form.accountNumber ?? "",
    iban: form.iban ?? "",
    payoutMobileNumber: form.payoutMobileNumber ?? "",
    settlementPreference: form.settlementPreference ?? "",
    bankAccountHolderMatchesOwner: form.bankAccountHolderMatchesOwner ?? false,
    bankNotes: form.bankNotes ?? "",
  };
}

export function useFieldPartnerOnboardingController(): FieldOnboardingController {
  const [state, setState] = useState<FieldOnboardingDraftState>(initialDraftState);
  const [validationErrors, setValidationErrors] = useState<FieldOnboardingValidationErrors>( {});

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
      const idx = FIELD_ONBOARDING_STEPS.indexOf(s.step);
      if (idx > 0) return { ...s, step: FIELD_ONBOARDING_STEPS[idx - 1]! };
      return s;
    });
  }, []);

  const ensureDraftCreated = useCallback(async (): Promise<boolean> => {
    const errors = validateIdentityStep(state.form);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return false;
    }
    setValidationErrors({});

    if (state.partnerId) return true;

    const form = state.form;
    try {
      const res = await fieldCreateDraft({
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
      });
      await fieldUpdatePartnerStore(res.id, buildStoreDraftInput(form));
      setState((s) => ({ ...s, partnerId: res.id, partnerVersion: res.version, submitError: null }));
      return true;
    } catch (err) {
      const msg = err && typeof err === "object" && "status" in err
        ? `فشل إنشاء مسودة الشريك (رمز الخطأ: ${(err as any).status})`
        : "فشل إنشاء مسودة الشريك";
      setState((s) => ({ ...s, submitError: msg }));
      return false;
    }
  }, [state]);

  const uploadDocument = useCallback(async (kind: DshPartnerDocumentType, mediaRef: string): Promise<boolean> => {
    if (!state.partnerId) {
      setState((s) => ({ ...s, submitError: "يجب إنشاء ملف الشريك أولًا قبل رفع المستندات" }));
      return false;
    }
    try {
      const doc = await fieldUploadDocument(state.partnerId, {
        documentType: kind,
        mediaRef,
        notes: "مرفوع عبر تطبيق الميداني",
      });
      setState((s) => ({
        ...s,
        uploadedDocumentIds: s.uploadedDocumentIds.includes(doc.id) ? s.uploadedDocumentIds : [...s.uploadedDocumentIds, doc.id],
        uploadedDocumentTypes: s.uploadedDocumentTypes.includes(kind) ? s.uploadedDocumentTypes : [...s.uploadedDocumentTypes, kind],
        submitError: null,
      }));
      return true;
    } catch (err) {
      setState((s) => ({ ...s, submitError: "تعذر رفع المستند. يرجى التحقق من اتصال الشبكة." }));
      return false;
    }
  }, [state.partnerId]);

  const nextStep = useCallback(async () => {
    const currentIdx = FIELD_ONBOARDING_STEPS.indexOf(state.step);

    if (state.step === "basics_profile") {
      const created = await ensureDraftCreated();
      if (!created) return;
      const ownerErrors = validateOwnerStep(state.form);
      if (Object.keys(ownerErrors).length > 0) {
        setValidationErrors(ownerErrors);
        return;
      }
      setValidationErrors({});
    }

    if (currentIdx >= 0 && currentIdx < FIELD_ONBOARDING_STEPS.length - 1) {
      setState((s) => ({ ...s, step: FIELD_ONBOARDING_STEPS[currentIdx + 1]! }));
    }
  }, [state, ensureDraftCreated]);

  const submitDraft = useCallback(async () => {
    if (!state.partnerId) return;
    setState((s) => ({ ...s, isSubmitting: true, submitError: null }));

    try {
      const updatedPartner = await fieldUpdatePartner(
        state.partnerId,
        buildBankAccountInput(state.form),
        state.partnerVersion ?? 0
      );
      await fieldUpdatePartnerStore(state.partnerId, buildStoreDraftInput(state.form));

      // Create field visit if we have location or notes
      if (state.visitNotes || state.locationLatitude !== null) {
        const visitPayload: import("../partner").DshCreatePartnerFieldVisitRequest = {
          visitNotes: state.visitNotes,
          evidenceMediaRefs: state.evidenceMediaRefs,
          ...(state.locationLatitude !== null && state.locationLongitude !== null && {
            locationLatitude: state.locationLatitude,
            locationLongitude: state.locationLongitude,
          }),
        };
        await fieldCreateVisit(state.partnerId, visitPayload);
      }

      await fieldSubmitPartner(state.partnerId);
      setState((s) => ({ ...s, isSubmitting: false, isSubmitted: true, partnerVersion: updatedPartner.version }));
    } catch (err) {
      const msg = err && typeof err === "object" && "status" in err && (err as any).status === 422
        ? "لا يمكن إرسال الملف في الحالة الحالية — تأكد من استكمال البيانات"
        : "فشل إرسال مسودة الشريك للمراجعة";
      setState((s) => ({
        ...s,
        isSubmitting: false,
        submitError: msg,
      }));
    }
  }, [state]);

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
    ensureDraftCreated,
    uploadDocument,
    nextStep,
    prevStep,
    submitDraft,
    reset,
  };
}
