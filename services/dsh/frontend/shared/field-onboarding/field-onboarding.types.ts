// Field onboarding types — for the app-field partner draft creation flow.
// No JSX. No ui-kit.

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

  // ── Offer / Agreement (Step 4) ────────────────────────────────
  preliminaryOffer: string;
  operatingHours: string;
  deliveryReadiness: string;
  financeNote: string;
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
  step: FieldPartnerDraftStep;
  form: Partial<FieldPartnerDraftForm>;
  visitNotes: string;
  locationLatitude: number | null;
  locationLongitude: number | null;
  evidenceMediaRefs: string[];
  uploadedDocumentIds: string[];
  isDirty: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  isSubmitted: boolean;
};

export function initialDraftState(): FieldOnboardingDraftState {
  return {
    partnerId: null,
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

export function getDocumentsMissingCount(): number {
  // Documents are always 2 until uploaded via field upload flow
  return 2;
}

export function getAgreementReviewMissingCount(form: Partial<FieldPartnerDraftForm>): number {
  let count = 0;
  if (!form.preliminaryOffer?.trim()) count++;
  if (!form.operatingHours?.trim()) count++;
  if (!form.deliveryReadiness?.trim()) count++;
  if (!form.financeNote?.trim()) count++;
  // + basics missing forwarded
  count += getBasicsProfileMissingCount(form);
  count += getLocationMediaMissingCount(form);
  count += getDocumentsMissingCount();
  return count;
}

// ── Global required missing items list (mirrors donor getPartnerRequiredMissingItems) ──

export function getFieldRequiredMissingItems(form: Partial<FieldPartnerDraftForm>): string[] {
  const missing: string[] = [];
  if (!form.ownerName?.trim()) missing.push("اسم المالك");
  if (!form.primaryPhone?.trim()) missing.push("جوال المالك");
  if (!form.storefrontPhotoRef?.trim()) missing.push("صورة الواجهة");
  if (!form.preliminaryOffer?.trim()) missing.push("العرض أو الاتفاق المبدئي");
  if (!form.operatingHours?.trim()) missing.push("ساعات العمل");
  // Always: documents are uploaded via field flow, default to missing
  missing.push("السجل التجاري");
  missing.push("هوية المالك");
  return missing;
}
