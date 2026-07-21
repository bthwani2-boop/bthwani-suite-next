// Field onboarding types — for the app-field partner draft creation flow.
// No JSX. No ui-kit.

import { DOCUMENT_TYPE_LABELS, REQUIRED_DOCUMENT_TYPES, type DshPartnerDocumentType, type PartnerOnboardingFailure } from "../partner";

export type FieldPartnerDraftForm = {
  // ── Identity (Step 1) ──────────────────────────────────────────
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

  // ── Location (Step 2) ──────────────────────────────────────────
  city: string;
  serviceAreaCode: string;
  addressLine: string;
  coverageSummary: string;

  // ── Photos (Step 2) ───────────────────────────────────────────
  storefrontPhotoRef: string;
  interiorPhotoRef: string;
  signagePhotoRef: string;

  // ── Operational agreement (Step 4) — non-financial only.
  // Commission/financial terms are owned by WLT and are never captured here.
  operatingHours: string;
  deliveryReadiness: string;

  // ── Bank account (Partner-level readiness/metadata — Step "bank_account") ──
  // Captured by app-field as declared payout details for control-panel review.
  // Never a WLT mutation: WLT stays the sole owner of financial truth.
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
  | "bank_account"
  | "agreement_review";

export const FIELD_ONBOARDING_STEPS: readonly FieldPartnerDraftStep[] = [
  "basics_profile",
  "location_media",
  "evidence",
  "bank_account",
  "agreement_review",
];

export const FIELD_ONBOARDING_STEP_LABELS: Record<FieldPartnerDraftStep, string> = {
  basics_profile: "البيانات الأساسية للمتجر",
  location_media: "الموقع الجغرافي",
  evidence: "المستندات والصور المرفقة",
  bank_account: "معلومات الحساب البنكي للشريك",
  agreement_review: "الاتفاق والمراجعة النهائية",
};

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
  if (!form.legalNameAr?.trim()) errors.legalNameAr = "الاسم التجاري بالعربية مطلوب";
  if (!form.legalIdentityNumber?.trim()) errors.legalIdentityNumber = "رقم الهوية التجارية مطلوب";
  if (!form.displayName?.trim()) errors.displayName = "اسم العرض مطلوب";
  return errors;
}

export function validateOwnerStep(form: Partial<FieldPartnerDraftForm>): FieldOnboardingValidationErrors {
  const errors: FieldOnboardingValidationErrors = {};
  if (!form.ownerName?.trim()) errors.ownerName = "اسم المالك مطلوب للمطابقة القانونية";
  if (!form.primaryPhone?.trim()) errors.primaryPhone = "رقم جوال المالك مطلوب للتواصل المباشر";
  return errors;
}

// ── Group-level missing count helpers (mirrors donor groupSummaries logic) ──

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
  form: Partial<FieldPartnerDraftForm> = {}
): number {
  return 0; // Documents and photos are optional (according to what is available)
}

export function getAgreementReviewMissingCount(
  form: Partial<FieldPartnerDraftForm>,
  uploadedDocumentTypes: DshPartnerDocumentType[]
): number {
  let count = 0;
  if (!form.operatingHours?.trim()) count++;
  if (!form.deliveryReadiness?.trim()) count++;
  // + basics missing forwarded
  count += getBasicsProfileMissingCount(form);
  count += getLocationMediaMissingCount(form);
  count += getDocumentsMissingCount(uploadedDocumentTypes, form);
  count += getBankAccountMissingCount(form);
  return count;
}

// ── Bank account missing-count helper ──
export function getBankAccountMissingCount(form: Partial<FieldPartnerDraftForm>): number {
  let count = 0;
  if (!form.beneficiaryName?.trim()) count++;
  if (!form.bankName?.trim()) count++;
  if (!form.accountNumber?.trim()) count++;
  if (!form.settlementPreference) count++;
  if (form.settlementPreference === "mobile_wallet" && !form.payoutMobileNumber?.trim()) {
    count++;
  }
  return count;
}

// ── Global required missing items list (mirrors donor getPartnerRequiredMissingItems) ──
export function getFieldRequiredMissingItems(
  form: Partial<FieldPartnerDraftForm>,
  uploadedDocumentTypes: DshPartnerDocumentType[]
): string[] {
  const missing: string[] = [];
  if (!form.legalNameAr?.trim()) missing.push("الاسم التجاري بالعربية");
  if (!form.legalIdentityNumber?.trim()) missing.push("رقم الهوية التجارية");
  if (!form.ownerName?.trim()) missing.push("اسم المالك");
  if (!form.primaryPhone?.trim()) missing.push("جوال المالك");
  if (!form.city?.trim()) missing.push("المدينة");
  if (!form.addressLine?.trim()) missing.push("العنوان");
  if (!form.operatingHours?.trim()) missing.push("ساعات العمل");
  if (!form.deliveryReadiness?.trim()) missing.push("جاهزية التوصيل");
  if (!form.beneficiaryName?.trim()) missing.push("اسم صاحب الحساب البنكي");
  if (!form.bankName?.trim()) missing.push("اسم البنك");
  if (!form.accountNumber?.trim()) missing.push("رقم الحساب البنكي");
  if (!form.settlementPreference) missing.push("طريقة التسوية المفضلة");
  if (form.settlementPreference === "mobile_wallet" && !form.payoutMobileNumber?.trim()) {
    missing.push("رقم محفظة الدفع");
  }
  return missing;
}
