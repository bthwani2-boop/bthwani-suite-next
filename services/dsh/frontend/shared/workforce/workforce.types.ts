// Sovereign service-provider types mirrored from core/workforce/contracts/
// workforce.openapi.yaml. Providers are independent contractors (field agent
// commission per store onboarding, captain delivery fees — owned by WLT),
// not salaried employees. actor_id is the shared key; phones live in
// Identity only and appear here masked.

export type EngagementStatus = "pending_activation" | "active" | "suspended" | "terminated";
export type EngagementType = "independent_contractor" | "agency_contractor";

export type WorkforceFieldProfile = {
  readonly cityCode?: string;
  readonly shiftCode?: string;
  readonly supervisorActorId?: string;
  readonly emergencyContactName?: string;
  readonly emergencyContactPhone?: string;
  readonly preferredLanguage?: string;
  readonly policyConsentAt?: string;
  readonly documentMediaRefs: readonly string[];
};

export type FieldAgent = {
  readonly actorId: string;
  readonly fullNameAr: string;
  readonly fullNameEn?: string;
  readonly providerCode: string;
  readonly engagementType: EngagementType;
  readonly engagementStartDate?: string;
  readonly engagementStatus: EngagementStatus;
  readonly photoMediaRef?: string;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly fieldProfile?: WorkforceFieldProfile;
};

export type FieldAgentDetail = FieldAgent & {
  readonly phoneMasked?: string;
  readonly authActive: boolean;
  readonly readyToIssue: boolean;
};

export type WorkforceMe = FieldAgent & {
  readonly phoneMasked?: string;
  readonly profileComplete: boolean;
};

export type CreateFieldAgentInput = {
  readonly fullNameAr: string;
  readonly fullNameEn?: string | undefined;
  readonly phoneE164: string;
  readonly providerCode: string;
  readonly engagementType?: EngagementType | undefined;
  readonly engagementStartDate?: string | undefined;
  readonly cityCode?: string | undefined;
  readonly shiftCode?: string | undefined;
  readonly supervisorActorId?: string | undefined;
  readonly photoMediaRef?: string | undefined;
  readonly documentMediaRefs?: readonly string[] | undefined;
};

export type UpdateFieldAgentInput = {
  readonly expectedVersion: number;
  readonly fullNameAr?: string | undefined;
  readonly fullNameEn?: string | undefined;
  readonly providerCode?: string | undefined;
  readonly engagementType?: EngagementType | undefined;
  readonly engagementStartDate?: string | undefined;
  readonly cityCode?: string | undefined;
  readonly shiftCode?: string | undefined;
  readonly supervisorActorId?: string | undefined;
  readonly photoMediaRef?: string | undefined;
};

export type UpdateSelfInput = {
  readonly photoMediaRef?: string | undefined;
  readonly emergencyContactName?: string | undefined;
  readonly emergencyContactPhone?: string | undefined;
  readonly preferredLanguage?: "ar" | "en" | undefined;
  readonly policyConsent?: boolean | undefined;
};

export type ActivationCodeResult = {
  readonly activationId: string;
  readonly code: string;
  readonly maskedPhone: string;
  readonly expiresAt: string;
};

export type WorkforceCity = {
  readonly code: string;
  readonly nameAr: string;
  readonly nameEn?: string;
  readonly active?: boolean;
};

export type WorkforceShift = {
  readonly code: string;
  readonly nameAr: string;
  readonly nameEn?: string;
  readonly startsAt?: string;
  readonly endsAt?: string;
  readonly active?: boolean;
};

export type FieldAgentListFilter = {
  readonly status?: EngagementStatus | undefined;
  readonly city?: string | undefined;
  readonly q?: string | undefined;
  readonly limit?: number | undefined;
  readonly offset?: number | undefined;
};

export const ENGAGEMENT_STATUS_LABEL_AR: Record<EngagementStatus, string> = {
  pending_activation: "جاهز للتفعيل",
  active: "مفعل",
  suspended: "موقوف",
  terminated: "منتهي",
};

export const ENGAGEMENT_TYPE_LABEL_AR: Record<EngagementType, string> = {
  independent_contractor: "مقدم خدمة مستقل",
  agency_contractor: "متعاقد عبر وكالة",
};
