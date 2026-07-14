// Sovereign service-provider types mirrored from core/workforce/contracts/
// workforce.openapi.yaml. Providers are independent contractors (field agent
// commission per store onboarding, captain delivery fees — owned by WLT),
// not salaried employees. actor_id is the shared key; phones live in
// Identity only and appear here masked.

export type EngagementStatus = "pending_activation" | "active" | "suspended" | "terminated";
export type EngagementType = "independent_contractor" | "employee";
export type ProviderKind = "field" | "captain" | "employee";
export type LicenseStatus = "missing" | "pending_review" | "valid" | "expired" | "rejected";

export type WorkforceFieldProfile = {
  readonly cityCode?: string;
  readonly serviceZoneId?: string;
  readonly shiftCode?: string;
  readonly supervisorActorId?: string;
  readonly emergencyContactName?: string;
  readonly emergencyContactPhone?: string;
  readonly preferredLanguage?: string;
  readonly policyConsentAt?: string;
  readonly documentMediaRefs: readonly string[];
};

export type WorkforceCaptainProfile = {
  readonly vehicleType?: string;
  readonly vehicleIdentifier?: string;
  readonly licenseStatus?: LicenseStatus;
  readonly licenseExpiresAt?: string;
  readonly operatingCityCode?: string;
  readonly serviceZoneId?: string;
  readonly operatingScopeCode?: string;
  readonly supervisorActorId?: string;
  readonly documentMediaRefs: readonly string[];
};

export type WorkforceEmployeeProfile = {
  readonly department?: string;
  readonly role?: string;
  readonly officeLocation?: string;
  readonly supervisorActorId?: string;
  readonly documentMediaRefs: readonly string[];
};

export type FieldAgent = {
  readonly actorId: string;
  readonly fullNameAr: string;
  readonly fullNameEn?: string;
  readonly workforceCode: string;
  readonly workforceKind: ProviderKind;
  readonly engagementType: EngagementType;
  readonly engagementStartDate?: string;
  readonly engagementStatus: EngagementStatus;
  readonly photoMediaRef?: string;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly fieldProfile?: WorkforceFieldProfile;
  readonly captainProfile?: WorkforceCaptainProfile;
  readonly employeeProfile?: WorkforceEmployeeProfile;
};

export type Captain = FieldAgent;

export type ActivationMetadata = {
  readonly activationId: string;
  readonly status: "pending" | "revoked" | "consumed" | "expired" | "locked";
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly maskedPhone: string;
};

export type FieldAgentDetail = FieldAgent & {
  readonly phoneMasked?: string;
  readonly authActive: boolean;
  readonly readyToIssue: boolean;
  readonly latestActivation?: ActivationMetadata;
};

export type CaptainDetail = FieldAgentDetail;

export type WorkforceMe = FieldAgent & {
  readonly phoneMasked?: string;
  readonly profileComplete: boolean;
};

export type CreateFieldAgentInput = {
  readonly fullNameAr: string;
  readonly fullNameEn?: string | undefined;
  readonly phoneE164: string;
  readonly engagementType?: EngagementType | undefined;
  readonly engagementStartDate?: string | undefined;
  readonly serviceZoneId: string;
  readonly shiftCode: string;
  readonly supervisorActorId?: string | undefined;
  readonly photoMediaRef?: string | undefined;
  readonly documentMediaRefs?: readonly string[] | undefined;
};

export type UpdateFieldAgentInput = {
  readonly expectedVersion: number;
  readonly fullNameAr?: string | undefined;
  readonly fullNameEn?: string | undefined;
  readonly engagementType?: EngagementType | undefined;
  readonly engagementStartDate?: string | undefined;
  readonly serviceZoneId?: string | undefined;
  readonly shiftCode?: string | undefined;
  readonly supervisorActorId?: string | undefined;
  readonly photoMediaRef?: string | undefined;
};

export type CreateCaptainInput = {
  readonly fullNameAr: string;
  readonly fullNameEn?: string | undefined;
  readonly phoneE164: string;
  readonly engagementType?: EngagementType | undefined;
  readonly engagementStartDate?: string | undefined;
  readonly photoMediaRef?: string | undefined;
  readonly vehicleType: string;
  readonly vehicleIdentifier: string;
  readonly licenseStatus?: LicenseStatus | undefined;
  readonly licenseExpiresAt?: string | undefined;
  readonly serviceZoneId: string;
  readonly operatingScopeCode?: string | undefined;
  readonly supervisorActorId?: string | undefined;
  readonly documentMediaRefs?: readonly string[] | undefined;
};

export type UpdateCaptainInput = {
  readonly expectedVersion: number;
  readonly fullNameAr?: string | undefined;
  readonly fullNameEn?: string | undefined;
  readonly engagementType?: EngagementType | undefined;
  readonly engagementStartDate?: string | undefined;
  readonly photoMediaRef?: string | undefined;
  readonly vehicleType?: string | undefined;
  readonly vehicleIdentifier?: string | undefined;
  readonly licenseStatus?: LicenseStatus | undefined;
  readonly licenseExpiresAt?: string | undefined;
  readonly serviceZoneId?: string | undefined;
  readonly operatingScopeCode?: string | undefined;
  readonly supervisorActorId?: string | undefined;
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

export type PlatformZone = {
  readonly id: string;
  readonly name: string;
  readonly cityCode: string;
  readonly isActive: boolean;
  readonly description?: string;
};

export type SupervisorCandidate = {
  readonly actorId: string;
  readonly username: string;
  readonly phoneMasked?: string;
  readonly active: boolean;
};

export type FieldAgentListFilter = {
  readonly status?: EngagementStatus | undefined;
  readonly city?: string | undefined;
  readonly q?: string | undefined;
  readonly limit?: number | undefined;
  readonly offset?: number | undefined;
};

export type CaptainListFilter = FieldAgentListFilter;

export const PROVIDER_KIND_LABEL_AR: Record<ProviderKind, string> = {
  field: "ميداني",
  captain: "كابتن",
  employee: "موظف",
};

export const ENGAGEMENT_STATUS_LABEL_AR: Record<EngagementStatus, string> = {
  pending_activation: "بانتظار التفعيل",
  active: "مفعل",
  suspended: "موقوف",
  terminated: "منتهي",
};

export const ENGAGEMENT_TYPE_LABEL_AR: Record<EngagementType, string> = {
  independent_contractor: "مقدم خدمة مستقل",
  employee: "موظف رسمي",
};
