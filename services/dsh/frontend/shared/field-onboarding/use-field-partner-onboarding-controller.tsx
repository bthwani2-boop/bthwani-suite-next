// Field onboarding controller — used by all app-field onboarding screens.
// No fetch in screens. No env in screens. All API calls here.
"use client";

import { useCallback, useRef, useState } from "react";
import {
  fieldCreateDraft,
  fieldGetPartner,
  fieldGetPartnerStore,
  fieldListDocuments,
  fieldListFieldVisits,
  fieldUpdatePartner,
  fieldUpdatePartnerStore,
  fieldSubmitPartner,
  fieldUploadDocument,
  fieldCreateVisit,
  createPartnerMutationContext,
  assertPartnerReadback,
  mapPartnerOnboardingFailure,
  type DshPartnerDocumentType,
} from "../partner";
import {
  initialDraftState,
  validateIdentityStep,
  validateOwnerStep,
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
  /** Validates identity + owner fields and creates the partner draft if it doesn't exist yet. Returns the partner id (existing or newly created), or false if blocked. */
  ensureDraftCreated: (placeholder?: boolean) => Promise<string | false>;
  uploadDocument: (kind: DshPartnerDocumentType, mediaRef: string) => Promise<boolean>;
  /** Loads an existing partner draft's full state from the server. Returns false on 403/404/network error. */
  loadDraft: (partnerId: string) => Promise<boolean>;
  /** Resets to a blank draft (partnerId undefined) or hydrates a different partner's draft, guarding against stale cross-draft state. */
  switchDraft: (partnerId: string | undefined) => Promise<void>;
  /** Persists edits to an already-created draft without triggering submission side-effects. */
  saveDraft: () => Promise<boolean>;
  /** Creates the draft if missing, otherwise saves edits to the existing draft. */
  save: () => Promise<boolean>;
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

function buildUpdatePartnerInput(form: Partial<FieldPartnerDraftForm>) {
  return {
    displayName: form.displayName ?? "",
    ownerName: form.ownerName ?? "",
    primaryPhone: form.primaryPhone ?? "",
    secondaryPhone: form.secondaryPhone ?? "",
    email: form.email ?? "",
    notes: form.notes ?? "",
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
  const [validationErrors, setValidationErrors] = useState<FieldOnboardingValidationErrors>({});
  const activeRouteKeyRef = useRef("new-draft");

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

  const ensureDraftCreated = useCallback(async (placeholder = false): Promise<string | false> => {
    if (state.partnerId) return state.partnerId;

    const form = { ...state.form };
    if (placeholder) {
      if (!form.legalNameAr?.trim()) form.legalNameAr = "شريك جديد";
      if (!form.displayName?.trim()) form.displayName = "شريك جديد";
      if (!form.primaryPhone?.trim()) form.primaryPhone = "+967770000000";
      if (!form.legalIdentityNumber?.trim()) form.legalIdentityNumber = "temp-" + Date.now();
      if (!form.ownerName?.trim()) form.ownerName = "مالك افتراضي";
    } else {
      const errors = { ...validateIdentityStep(form), ...validateOwnerStep(form) };
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        return false;
      }
      setValidationErrors({});
    }

    try {
      const createMutation = createPartnerMutationContext("field-create-draft", "new-draft");
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
      }, createMutation);
      await fieldUpdatePartnerStore(
        res.id,
        buildStoreDraftInput(form),
        createPartnerMutationContext("field-update-first-store", res.id),
      );
      const readback = assertPartnerReadback(res.id, res.version, await fieldGetPartner(res.id));
      setState((s) => ({
        ...s,
        partnerId: readback.id,
        partnerVersion: readback.version,
        form: { ...s.form, ...form },
        submitError: null,
        runtimeFailure: null,
      }));
      return readback.id;
    } catch (err) {
      const failure = mapPartnerOnboardingFailure(err);
      setState((s) => ({ ...s, submitError: failure.message, runtimeFailure: failure }));
      return false;
    }
  }, [state.partnerId, state.form, setState, setValidationErrors]);

  const loadDraft = useCallback(async (partnerId: string): Promise<boolean> => {
    setState((s) => ({ ...s, loadStatus: "hydrating", loadError: null, runtimeFailure: null }));
    try {
      const [partner, storeRes, documentsRes, visitsRes] = await Promise.all([
        fieldGetPartner(partnerId),
        fieldGetPartnerStore(partnerId),
        fieldListDocuments(partnerId),
        fieldListFieldVisits(partnerId),
      ]);
      const latestVisit = visitsRes.visits[0];
      setState((s) => ({
        ...s,
        partnerId: partner.id,
        partnerVersion: partner.version,
        form: {
          ...s.form,
          legalNameAr: partner.legalNameAr,
          legalNameEn: partner.legalNameEn,
          displayName: partner.displayName,
          legalIdentityType: partner.legalIdentityType as FieldPartnerDraftForm["legalIdentityType"],
          legalIdentityNumber: partner.legalIdentityNumber,
          ownerName: partner.ownerName,
          primaryPhone: partner.primaryPhone,
          secondaryPhone: partner.secondaryPhone,
          email: partner.email,
          category: partner.category as FieldPartnerDraftForm["category"],
          notes: partner.notes,
          city: storeRes.store.cityCode,
          serviceAreaCode: storeRes.store.serviceAreaCode,
          addressLine: storeRes.store.addressLine,
          coverageSummary: storeRes.store.coverageSummary,
          storefrontPhotoRef: storeRes.store.storefrontPhotoRef,
          interiorPhotoRef: storeRes.store.interiorPhotoRef,
          signagePhotoRef: storeRes.store.signagePhotoRef,
          operatingHours: storeRes.store.operatingHours,
          deliveryReadiness: storeRes.store.deliveryReadiness,
          beneficiaryName: partner.beneficiaryName,
          bankName: partner.bankName,
          bankBranch: partner.bankBranch,
          accountNumber: "",
          iban: "",
          payoutMobileNumber: "",
          settlementPreference: partner.settlementPreference as FieldPartnerDraftForm["settlementPreference"],
          bankAccountHolderMatchesOwner: partner.bankAccountHolderMatchesOwner,
          bankNotes: partner.bankNotes,
        },
        uploadedDocumentIds: documentsRes.documents.map((d) => d.id),
        uploadedDocumentTypes: documentsRes.documents.map((d) => d.documentType) as DshPartnerDocumentType[],
        visitNotes: latestVisit?.visitNotes ?? "",
        locationLatitude: latestVisit?.locationLatitude ?? null,
        locationLongitude: latestVisit?.locationLongitude ?? null,
        evidenceMediaRefs: latestVisit?.evidenceMediaRefs ?? [],
        isDirty: false,
        loadStatus: "ready",
      }));
      return true;
    } catch (err) {
      const failure = mapPartnerOnboardingFailure(err);
      setState((s) => ({ ...s, loadStatus: "error", loadError: failure.message, runtimeFailure: failure }));
      return false;
    }
  }, []);

  const switchDraft = useCallback(async (partnerId: string | undefined): Promise<void> => {
    const routeKey = partnerId ? `partner:${partnerId}` : "new-draft";
    if (activeRouteKeyRef.current === routeKey) return;
    activeRouteKeyRef.current = routeKey;
    if (!partnerId) {
      setState(initialDraftState());
      setValidationErrors({});
      return;
    }
    setState(initialDraftState());
    setValidationErrors({});
    await loadDraft(partnerId);
  }, [loadDraft]);

  const saveDraft = useCallback(async (): Promise<boolean> => {
    if (!state.partnerId) return false;
    setState((s) => ({ ...s, isSaving: true, submitError: null, runtimeFailure: null }));
    try {
      const expectedVersion = state.partnerVersion ?? 0;
      const updatedPartner = await fieldUpdatePartner(
        state.partnerId,
        buildUpdatePartnerInput(state.form),
        expectedVersion,
        createPartnerMutationContext("field-save-partner", state.partnerId, expectedVersion),
      );
      await fieldUpdatePartnerStore(
        state.partnerId,
        buildStoreDraftInput(state.form),
        createPartnerMutationContext("field-save-store", state.partnerId),
      );
      const readback = assertPartnerReadback(
        state.partnerId,
        updatedPartner.version,
        await fieldGetPartner(state.partnerId),
      );
      setState((s) => ({
        ...s,
        isSaving: false,
        isDirty: false,
        partnerVersion: readback.version,
        submitError: null,
        lastSavedAt: new Date().toISOString(),
      }));
      return true;
    } catch (err) {
      const failure = mapPartnerOnboardingFailure(err);
      setState((s) => ({
        ...s,
        isSaving: false,
        submitError: failure.message,
        runtimeFailure: failure,
      }));
      return false;
    }
  }, [state]);

  const save = useCallback(async (): Promise<boolean> => {
    if (state.partnerId) return saveDraft();
    return (await ensureDraftCreated()) !== false;
  }, [state.partnerId, saveDraft, ensureDraftCreated]);

  const uploadDocument = useCallback(async (kind: DshPartnerDocumentType, mediaRef: string): Promise<boolean> => {
    if (!state.partnerId) {
      setState((s) => ({ ...s, submitError: "يجب إنشاء ملف الشريك أولًا قبل رفع المستندات" }));
      return false;
    }
    try {
      const doc = await fieldUploadDocument(
        state.partnerId,
        {
          documentType: kind,
          mediaRef,
          notes: "مرفوع عبر تطبيق الميداني",
        },
        createPartnerMutationContext("field-upload-document", `${state.partnerId}:${kind}`),
      );
      setState((s) => ({
        ...s,
        uploadedDocumentIds: s.uploadedDocumentIds.includes(doc.id) ? s.uploadedDocumentIds : [...s.uploadedDocumentIds, doc.id],
        uploadedDocumentTypes: s.uploadedDocumentTypes.includes(kind) ? s.uploadedDocumentTypes : [...s.uploadedDocumentTypes, kind],
        submitError: null,
        runtimeFailure: null,
      }));
      return true;
    } catch (err) {
      const failure = mapPartnerOnboardingFailure(err);
      setState((s) => ({ ...s, submitError: failure.message, runtimeFailure: failure }));
      return false;
    }
  }, [state.partnerId]);

  const submitDraft = useCallback(async () => {
    if (!state.partnerId) return;
    setState((s) => ({ ...s, isSubmitting: true, submitError: null, runtimeFailure: null }));

    try {
      const expectedVersion = state.partnerVersion ?? 0;
      const updatedPartner = await fieldUpdatePartner(
        state.partnerId,
        buildUpdatePartnerInput(state.form),
        expectedVersion,
        createPartnerMutationContext("field-submit-save", state.partnerId, expectedVersion),
      );
      await fieldUpdatePartnerStore(
        state.partnerId,
        buildStoreDraftInput(state.form),
        createPartnerMutationContext("field-submit-store", state.partnerId),
      );

      // Create field visit if we have location or notes.
      if (state.visitNotes || state.locationLatitude !== null) {
        const visitPayload: import("../partner").DshCreatePartnerFieldVisitRequest = {
          visitNotes: state.visitNotes,
          evidenceMediaRefs: state.evidenceMediaRefs,
          ...(state.locationLatitude !== null && state.locationLongitude !== null && {
            locationLatitude: state.locationLatitude,
            locationLongitude: state.locationLongitude,
          }),
        };
        await fieldCreateVisit(
          state.partnerId,
          visitPayload,
          createPartnerMutationContext("field-submit-visit", state.partnerId),
        );
      }

      const submitted = await fieldSubmitPartner(
        state.partnerId,
        createPartnerMutationContext("field-submit-partner", state.partnerId, updatedPartner.version),
      );
      const readback = assertPartnerReadback(
        state.partnerId,
        submitted.partner.version,
        await fieldGetPartner(state.partnerId),
      );
      setState((s) => ({
        ...s,
        isSubmitting: false,
        isSubmitted: true,
        partnerVersion: readback.version,
        runtimeFailure: null,
      }));
    } catch (err) {
      const failure = mapPartnerOnboardingFailure(err);
      setState((s) => ({
        ...s,
        isSubmitting: false,
        submitError: failure.message,
      }));
    }
  }, [state]);

  const reset = useCallback(() => {
    activeRouteKeyRef.current = "new-draft";
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
    loadDraft,
    switchDraft,
    saveDraft,
    save,
    submitDraft,
    reset,
  };
}
