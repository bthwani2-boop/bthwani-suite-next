// Sovereign workforce types mirrored from core/workforce. The person record is
// unified, while employee, captain and field operational facts remain separate.
// Independent providers have no shifts. WLT owns all monetary truth.

export type EngagementStatus = "pending_activation" | "active" | "suspended" | "terminated";
export type EngagementType = "independent_contractor" | "employee";
export type ProviderKind = "field" | "captain" | "employee";
export type LicenseStatus = "missing" | "pending_review" | "valid" | "expired" | "rejected";

export type WorkforceFieldProfile = {
  readonly cityCode?: string;
  readonly serviceZoneId?: string;
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
export type Employee = FieldAgent;

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
export type EmployeeDetail = FieldAgentDetail;

export type WorkforceMe = FieldAgent & {
  readonly phoneMasked?: string;
  readonly profileComplete: boolean;
};

// Initial creation is deliberately short. Identity, guarantor, contract and
// review facts are completed progressively through the operational core.
export type CreateFieldAgentInput = {
  readonly fullNameAr: string;
  readonly fullNameEn?: string | undefined;
  readonly phoneE164: string;
  readonly engagementType?: EngagementType | undefined;
  readonly engagementStartDate?: string | undefined;
  readonly serviceZoneId: string;
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
  readonly vehicleIdentifier?: string | undefined;
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

export type CreateEmployeeInput = {
  readonly fullNameAr: string;
  readonly fullNameEn?: string | undefined;
  readonly phoneE164: string;
  readonly engagementType?: "employee" | undefined;
  readonly engagementStartDate?: string | undefined;
  readonly photoMediaRef?: string | undefined;
  readonly department: string;
  readonly role: string;
  readonly officeLocation?: string | undefined;
  readonly supervisorActorId?: string | undefined;
  readonly documentMediaRefs?: readonly string[] | undefined;
};

export type UpdateEmployeeInput = {
  readonly expectedVersion: number;
  readonly fullNameAr?: string | undefined;
  readonly fullNameEn?: string | undefined;
  readonly engagementStartDate?: string | undefined;
  readonly photoMediaRef?: string | undefined;
  readonly department?: string | undefined;
  readonly role?: string | undefined;
  readonly officeLocation?: string | undefined;
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

// Shifts remain reference data for employees only. They are never accepted by
// field or captain creation/update contracts.
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
export type EmployeeListFilter = FieldAgentListFilter;

export type ReferralSourceType = "employee" | "captain" | "field" | "partner" | "advertisement" | "social_media" | "public_referral" | "direct" | "other";
export type IdentityVerificationStatus = "pending" | "under_review" | "approved" | "rejected" | "expired" | "needs_resubmission";
export type ContractReviewStatus = "pending" | "under_review" | "approved" | "rejected" | "needs_resubmission";
export type ProviderOnboardingStage = "basic_profile" | "documents_pending" | "documents_review" | "training_pending" | "partnerships_review" | "operations_review" | "activation_ready" | "active";
export type CaptainClassification = "joker" | "basic";

export type CaptainActivationCore = {
  readonly classification: CaptainClassification;
  readonly financialGuaranteeMinorUnits: number;
  readonly financialGuaranteeCurrency: string;
  readonly financialGuaranteeStatus: "not_funded" | "pending_review" | "funded" | "released" | "forfeited";
  readonly financialGuaranteeReference?: string;
  readonly deliveryBagCustodyStatus: "not_issued" | "issued" | "returned" | "lost" | "damaged";
  readonly deliveryBagCustodyReference?: string;
  readonly mandatoryPurchasesStatus: "not_required" | "pending_payment" | "paid" | "paid_and_delivered" | "cancelled";
  readonly mandatoryPurchasesReference?: string;
  readonly trainingStatus: "pending" | "in_progress" | "passed" | "failed";
  readonly operationsAccreditationStatus: "pending" | "approved" | "suspended" | "expired";
  readonly classificationUpdatedAt?: string;
  readonly version: number;
};

export type ProviderOperationalCore = {
  readonly actorId: string;
  readonly workforceKind: "field" | "captain";
  readonly referralSourceType: ReferralSourceType;
  readonly referralSourceActorId?: string;
  readonly referralPartnerId?: string;
  readonly referralChannel?: string;
  readonly referralNote?: string;
  readonly guarantorFullName?: string;
  readonly guarantorRelationship?: string;
  readonly guarantorPhoneE164?: string;
  readonly guarantorPhoneVerifiedAt?: string;
  readonly nationalIdNumber?: string;
  readonly identityFrontMediaRef?: string;
  readonly identityBackMediaRef?: string;
  readonly identityVerificationStatus: IdentityVerificationStatus;
  readonly identityRejectionReason?: string;
  readonly contractMediaRef?: string;
  readonly contractReviewStatus: ContractReviewStatus;
  readonly contractRejectionReason?: string;
  readonly onboardingStage: ProviderOnboardingStage;
  readonly partnershipsApprovedAt?: string;
  readonly version: number;
  readonly captain?: CaptainActivationCore;
};

export type ActivationReadiness = { readonly ready: boolean; readonly missing: readonly string[] };
export type OperationalCoreResponse = { readonly operationalCore: ProviderOperationalCore; readonly activationReadiness: ActivationReadiness };
export type OperationalCorePatch = Partial<Omit<ProviderOperationalCore, "actorId" | "workforceKind" | "version" | "captain">> & {
  readonly guarantorPhoneVerified?: boolean;
  readonly partnershipsApproved?: boolean;
  readonly captain?: Partial<CaptainActivationCore>;
};

export type ProviderAvailabilityNotice = {
  readonly id: string;
  readonly actorId: string;
  readonly noticeType: "planned_unavailability" | "immediate_unavailability" | "short_break" | "emergency" | "temporary_restriction";
  readonly startsAt: string;
  readonly endsAt: string;
  readonly serviceZoneId?: string;
  readonly reasonCode: string;
  readonly note?: string;
  readonly status: "scheduled" | "active" | "completed" | "cancelled";
};

export type ProviderIncident = {
  readonly id: string;
  readonly actorId: string;
  readonly incidentCode: string;
  readonly sourceType: string;
  readonly sourceId?: string;
  readonly description: string;
  readonly evidenceMediaRefs: readonly string[];
  readonly severity: "minor" | "major" | "critical";
  readonly status: string;
  readonly policyId?: string;
  readonly proposedPenaltyMinorUnits: number;
  readonly currency: string;
  readonly wltLedgerReference?: string;
  readonly appealNote?: string;
  readonly resolutionNote?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export const PROVIDER_KIND_LABEL_AR: Record<ProviderKind, string> = {
  field: "ميداني",
  captain: "كابتن",
  employee: "موظف إداري",
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
