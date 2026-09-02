// Workforce contract surface for DSH consumers. Every named type here is a
// derived alias of the canonical generated client in @bthwani/core-workforce;
// no hand-written contract truth lives on this side. The person record is
// unified, while employee, captain and field operational facts remain separate.
// Independent providers have no shifts. WLT owns all monetary truth.

import type { components, operations } from "@bthwani/core-workforce";

type Schemas = components["schemas"];
type Responses = components["responses"];

export type EngagementStatus = Schemas["EngagementStatus"];
export type ProviderKind = Schemas["WorkforceKind"];
export type LicenseStatus = NonNullable<Schemas["UpdateCaptainRequest"]["licenseStatus"]>;

export type FieldAgent = Schemas["FieldAgent"];
export type Captain = Schemas["FieldAgent"];
export type Employee = Schemas["FieldAgent"];

export type ActivationMetadata = Schemas["ActivationMetadata"];
export type FieldAgentDetail = Schemas["FieldAgentDetail"];
export type CaptainDetail = Schemas["FieldAgentDetail"];
export type EmployeeDetail = Schemas["FieldAgentDetail"];

export type WorkforceMe = Schemas["MeView"];

export type CreateFieldAgentInput = Schemas["CreateFieldAgentRequest"];
export type UpdateFieldAgentInput = Schemas["UpdateFieldAgentRequest"];
export type CreateCaptainInput = Schemas["CreateCaptainRequest"];
export type UpdateCaptainInput = Schemas["UpdateCaptainRequest"];
export type CreateEmployeeInput = Schemas["CreateEmployeeRequest"];
export type UpdateEmployeeInput = Schemas["UpdateEmployeeRequest"];

export type UpdateSelfInput = Schemas["UpdateSelfRequest"];

export type ActivationCodeResult = Schemas["ActivationCodeResult"];

// Shifts remain reference data for employees only. They are never accepted by
// field or captain creation/update contracts.
export type WorkforceShift = Schemas["Shift"];

export type SupervisorCandidate = Schemas["SupervisorCandidate"];

type ListQuery<Op extends keyof operations> = NonNullable<NonNullable<operations[Op]["parameters"]>["query"]>;

export type FieldAgentListFilter = ListQuery<"listFieldAgents">;
export type CaptainListFilter = ListQuery<"listCaptains">;
export type EmployeeListFilter = ListQuery<"listEmployees">;

export type ReferralSourceType = Schemas["ProviderOperationalCore"]["referralSourceType"];
export type IdentityVerificationStatus = Schemas["ProviderOperationalCore"]["identityVerificationStatus"];
export type ContractReviewStatus = Schemas["ProviderOperationalCore"]["contractReviewStatus"];
export type ProviderOnboardingStage = Schemas["ProviderOperationalCore"]["onboardingStage"];

export type CaptainActivationCore = Schemas["CaptainActivationCore"];
export type ProviderOperationalCore = Schemas["ProviderOperationalCore"];
export type OperationalCoreResponse = NonNullable<Responses["OperationalCoreResponse"]["content"]["application/json"]>;
export type OperationalCorePatch = Schemas["OperationalCorePatch"];

export type ProviderAvailabilityNotice = Schemas["AvailabilityNotice"];

export type ProviderIncident = Schemas["ProviderIncident"];

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

