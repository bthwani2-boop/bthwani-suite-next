// Field onboarding types — for the app-field partner draft creation flow.
// No JSX. No ui-kit.

import type { DshPartnerDocumentType } from "../partner";
import { REQUIRED_DOCUMENT_TYPES } from "../partner";

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
};

export type FieldPartnerDraftStep =
  | "identity"
  | "owner"
  | "store"
  | "location"
  | "documents"
  | "visit-notes"
  | "review";

export const FIELD_ONBOARDING_STEPS: FieldPartnerDraftStep[] = [
  "identity",
  "owner",
  "store",
  "location",
  "documents",
  "visit-notes",
  "review",
];

export const FIELD_ONBOARDING_STEP_LABELS: Record<FieldPartnerDraftStep, string> = {
  identity: "بيانات الهوية التجارية",
  owner: "بيانات المالك",
  store: "بيانات الفرع",
  location: "الموقع الجغرافي",
  documents: "الوثائق",
  "visit-notes": "ملاحظات الزيارة",
  review: "المراجعة والإرسال",
};

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
  isSubmitted: boolean;
};

export function initialDraftState(): FieldOnboardingDraftState {
  return {
    partnerId: null,
    partnerVersion: null,
    step: "identity",
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
    isSubmitted: false,
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
  if (!form.ownerName?.trim()) count++;
  if (!form.primaryPhone?.trim()) count++;
  return count;
}

export function getLocationMediaMissingCount(form: Partial<FieldPartnerDraftForm>): number {
  let count = 0;
  if (!form.addressLine?.trim()) count++;
  if (!form.storefrontPhotoRef?.trim()) count++;
  if (!form.interiorPhotoRef?.trim()) count++;
  return count;
}

export function getDocumentsMissingCount(uploadedDocumentTypes: DshPartnerDocumentType[]): number {
  return REQUIRED_DOCUMENT_TYPES.filter((type) => !uploadedDocumentTypes.includes(type)).length;
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
  count += getDocumentsMissingCount(uploadedDocumentTypes);
  return count;
}

// ── Global required missing items list (mirrors donor getPartnerRequiredMissingItems) ──

const DOCUMENT_TYPE_MISSING_LABELS: Record<DshPartnerDocumentType, string> = {
  national_id: "هوية المالك",
  commercial_register: "السجل التجاري",
  lease_agreement: "عقد الإيجار أو الملكية",
  health_certificate: "شهادة صحة / ترخيص",
  store_photo: "صورة المتجر",
  owner_photo: "صورة المالك",
  other: "مستند آخر",
};

export function getFieldRequiredMissingItems(
  form: Partial<FieldPartnerDraftForm>,
  uploadedDocumentTypes: DshPartnerDocumentType[]
): string[] {
  const missing: string[] = [];
  if (!form.ownerName?.trim()) missing.push("اسم المالك");
  if (!form.primaryPhone?.trim()) missing.push("جوال المالك");
  if (!form.storefrontPhotoRef?.trim()) missing.push("صورة الواجهة");
  if (!form.operatingHours?.trim()) missing.push("ساعات العمل");
  for (const type of REQUIRED_DOCUMENT_TYPES) {
    if (!uploadedDocumentTypes.includes(type)) missing.push(DOCUMENT_TYPE_MISSING_LABELS[type]);
  }
  return missing;
}
