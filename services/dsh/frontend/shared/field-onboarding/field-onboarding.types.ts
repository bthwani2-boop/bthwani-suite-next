// Field onboarding types — for the app-field partner draft creation flow.
// No JSX. No ui-kit.

import { type DshPartnerDocumentType, type PartnerOnboardingFailure } from "../partner";

export type FieldPartnerDraftForm = {
  // ── Identity ────────────────────────────────────────────────────────
  legalNameAr: string;
  legalNameEn: string;
  displayName: string;
  legalIdentityType: "commercial_register" | "national_id" | "freelancer_certificate";
  legalIdentityNumber: string;
  ownerName: string;
  primaryPhone: string;
  secondaryPhone: string;
  email: string;
  category: "restaurant" | "grocery" | "pharmacy" | "bakery" | "default";
  notes: string;

  // ── Location ────────────────────────────────────────────────────────
  city: string;
  serviceAreaCode: string;
  addressLine: string;
  coverageSummary: string;

  // ── Store photos ────────────────────────────────────────────────────
  storefrontPhotoRef: string;
  interiorPhotoRef: string;
  signagePhotoRef: string;

  // ── Operational readiness ──────────────────────────────────────────
  operatingHours: string;
  deliveryReadiness: string;

  // ── Optional settlement metadata ───────────────────────────────────
  // These fields remain readable for backward compatibility, but app-field
  // no longer blocks partner intake on sensitive payout data. The partner or
  // an authorized operator completes and verifies it after intake.
  beneficiaryName: string;
  bankName: string;
  bankBranch: string;
  accountNumber: string;
  iban: string;
  payoutMobileNumber: string;
  settlementPreference: "" | "bank_transfer" | "mobile_wallet";
  bankAccountHolderMatchesOwner: boolean;
  bankNotes: string;
};

export type FieldPartnerDraftStep =
  | "basics_profile"
  | "location_media"
  | "evidence"
  | "catalog_setup"
  | "agreement_review";

export const FIELD_ONBOARDING_STEPS: readonly FieldPartnerDraftStep[] = [
  "basics_profile",
  "location_media",
  "evidence",
  "catalog_setup",
  "agreement_review",
];

export const FIELD_ONBOARDING_STEP_LABELS: Record<FieldPartnerDraftStep, string> = {
  basics_profile: "البيانات الأساسية للمتجر",
  location_media: "الموقع الجغرافي",
  evidence: "المستندات والصور",
  catalog_setup: "إعداد منتجات المتجر",
  agreement_review: "التشغيل والمراجعة النهائية",
};

export type FieldRequiredDocument = {
  readonly key: string;
  readonly documentType: DshPartnerDocumentType;
  readonly label: string;
};

/**
 * Required evidence follows the legal identity selected in the same draft.
 * The current database contract has no dedicated freelancer-certificate
 * document enum, so that certificate is stored as `other` with a precise UI
 * label until the cross-surface document taxonomy is versioned centrally.
 */
export function getRequiredPartnerDocuments(
  form: Partial<FieldPartnerDraftForm>,
): readonly FieldRequiredDocument[] {
  switch (form.legalIdentityType) {
    case "national_id":
      return [
        { key: "identity_proof", documentType: "national_id", label: "الهوية الوطنية للمالك" },
      ];
    case "freelancer_certificate":
      return [
        { key: "identity_proof", documentType: "national_id", label: "الهوية الوطنية للمالك" },
        { key: "freelancer_certificate", documentType: "other", label: "وثيقة العمل الحر" },
      ];
    case "commercial_register":
    default:
      return [
        { key: "commercial_registration", documentType: "commercial_register", label: "السجل التجاري" },
        { key: "identity_proof", documentType: "national_id", label: "الهوية الوطنية للمالك" },
      ];
  }
}

export type FieldOnboardingLoadStatus = "idle" | "hydrating" | "ready" | "error";

export type FieldOnboardingDraftState = {
  partnerId: string | null;
  partnerVersion: number | null;
  step: FieldPartnerDraftStep;
  form: Partial<FieldPartnerDraftForm>;
  visitNotes: string;
  locationLatitude: number | null;
  locationLongitude: number | null;
  evidenceMediaRefs: string[];
  uploadedDocumentIds: string[];
  uploadedDocumentTypes: DshPartnerDocumentType[];
  isDirty: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  failure: PartnerOnboardingFailure | null;
  isSubmitted: boolean;
  loadStatus: FieldOnboardingLoadStatus;
  loadError: string | null;
  isSaving: boolean;
  lastSavedAt: string | null;
};

export function initialDraftState(): FieldOnboardingDraftState {
  return {
    partnerId: null,
    partnerVersion: null,
    step: "basics_profile",
    form: {
      legalIdentityType: "commercial_register",
      category: "default",
    },
    visitNotes: "",
    locationLatitude: null,
    locationLongitude: null,
    evidenceMediaRefs: [],
    uploadedDocumentIds: [],
    uploadedDocumentTypes: [],
    isDirty: false,
    isSubmitting: false,
    submitError: null,
    failure: null,
    isSubmitted: false,
    loadStatus: "idle",
    loadError: null,
    isSaving: false,
    lastSavedAt: null,
  };
}

export type FieldOnboardingValidationErrors = Partial<Record<keyof FieldPartnerDraftForm, string>>;

export function validateIdentityStep(form: Partial<FieldPartnerDraftForm>): FieldOnboardingValidationErrors {
  const errors: FieldOnboardingValidationErrors = {};
  if (!form.legalNameAr?.trim()) errors.legalNameAr = "اسم المتجر مطلوب";
  if (!form.legalIdentityNumber?.trim()) errors.legalIdentityNumber = "رقم الهوية القانونية مطلوب";
  if (!form.displayName?.trim()) errors.displayName = "اسم العرض مطلوب";
  return errors;
}

export function validateOwnerStep(form: Partial<FieldPartnerDraftForm>): FieldOnboardingValidationErrors {
  const errors: FieldOnboardingValidationErrors = {};
  if (!form.ownerName?.trim()) errors.ownerName = "اسم المالك مطلوب للمطابقة القانونية";
  if (!form.primaryPhone?.trim()) errors.primaryPhone = "رقم جوال المالك مطلوب للتواصل المباشر";
  return errors;
}

export function getBasicsProfileMissingCount(form: Partial<FieldPartnerDraftForm>): number {
  let count = 0;
  if (!form.legalNameAr?.trim()) count++;
  if (!form.legalIdentityNumber?.trim()) count++;
  if (!form.ownerName?.trim()) count++;
  if (!form.primaryPhone?.trim()) count++;
  return count;
}

export function getLocationMediaMissingCount(form: Partial<FieldPartnerDraftForm>): number {
  let count = 0;
  if (!form.city?.trim()) count++;
  if (!form.addressLine?.trim()) count++;
  return count;
}

export function getDocumentsMissingCount(
  uploadedDocumentTypes: DshPartnerDocumentType[],
  form: Partial<FieldPartnerDraftForm> = {},
): number {
  return getRequiredPartnerDocuments(form).filter(
    (item) => !uploadedDocumentTypes.includes(item.documentType),
  ).length;
}

/** Settlement data is intentionally optional during field intake. */
export function getBankAccountMissingCount(_form: Partial<FieldPartnerDraftForm>): number {
  return 0;
}

/** Catalog setup is accelerated in the same visit but does not block intake. */
export function getCatalogSetupMissingCount(): number {
  return 0;
}

export function getAgreementReviewMissingCount(
  form: Partial<FieldPartnerDraftForm>,
  uploadedDocumentTypes: DshPartnerDocumentType[],
): number {
  let count = 0;
  if (!form.operatingHours?.trim()) count++;
  if (!form.deliveryReadiness?.trim()) count++;
  count += getBasicsProfileMissingCount(form);
  count += getLocationMediaMissingCount(form);
  count += getDocumentsMissingCount(uploadedDocumentTypes, form);
  return count;
}

export function getFieldRequiredMissingItems(
  form: Partial<FieldPartnerDraftForm>,
  uploadedDocumentTypes: DshPartnerDocumentType[],
): string[] {
  const missing: string[] = [];
  if (!form.legalNameAr?.trim()) missing.push("اسم المتجر");
  if (!form.legalIdentityNumber?.trim()) missing.push("رقم الهوية القانونية");
  if (!form.ownerName?.trim()) missing.push("اسم المالك");
  if (!form.primaryPhone?.trim()) missing.push("جوال المالك");
  if (!form.city?.trim()) missing.push("المدينة");
  if (!form.addressLine?.trim()) missing.push("العنوان");
  for (const document of getRequiredPartnerDocuments(form)) {
    if (!uploadedDocumentTypes.includes(document.documentType)) {
      missing.push(document.label);
    }
  }
  if (!form.operatingHours?.trim()) missing.push("ساعات العمل");
  if (!form.deliveryReadiness?.trim()) missing.push("طريقة التوصيل والاستلام");
  return missing;
}
