// Field onboarding types — for the app-field partner draft creation flow.
// No JSX. No ui-kit.

export type FieldPartnerDraftForm = {
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
  if (!form.primaryPhone?.trim()) errors.primaryPhone = "رقم الجوال الأساسي مطلوب";
  return errors;
}
