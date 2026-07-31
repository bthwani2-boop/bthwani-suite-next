import { corrId, createDshHttpClient } from "../_kernel/dsh-http-request";
import type { ActivationCodeResult, Employee } from "./workforce.types";

const { request } = createDshHttpClient("/api/workforce", "workforce", 15000);

export type LeadershipEmploymentClass = "coordinator" | "department_manager" | "executive" | "project_manager";
export type LeadershipPermissionBundle = string;

export type WorkforceReferenceOption = {
  readonly code: string;
  readonly nameAr: string;
  readonly nameEn: string;
};

export type EmployeePermissionBundleDescriptor = {
  readonly code: LeadershipPermissionBundle;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly allowedEmploymentClasses: readonly string[];
  readonly defaultDepartmentScope?: string;
  readonly departmentSelectionAllowed: boolean;
};

export type SovereignLeadershipReferenceData = {
  readonly employmentClasses: readonly WorkforceReferenceOption[];
  readonly departments: readonly WorkforceReferenceOption[];
  readonly officeLocations: readonly WorkforceReferenceOption[];
  readonly permissionBundles: readonly EmployeePermissionBundleDescriptor[];
};

export type SovereignLeadershipGovernance = {
  readonly actorId: string;
  readonly positionTitle: string;
  readonly jobGrade: string;
  readonly employmentClass: LeadershipEmploymentClass;
  readonly guaranteeType: string;
  readonly guaranteeStatus: string;
  readonly guaranteeReference?: string;
  readonly responsibilityScopes: readonly string[];
  readonly managedDepartmentCodes: readonly string[];
  readonly notes?: string;
  readonly version: number;
};

export type SovereignLeadershipAssignment = {
  readonly actorId: string;
  readonly permissionBundle: LeadershipPermissionBundle;
  readonly departmentScope: string;
  readonly startsOn: string;
  readonly endsOn?: string;
  readonly assignmentStatus: "active" | "suspended" | "expired" | "ended";
  readonly version: number;
};

export type SovereignLeadershipRecord = {
  readonly employee: Employee;
  readonly governance: SovereignLeadershipGovernance;
  readonly assignment: SovereignLeadershipAssignment;
};

export type CreateSovereignLeaderInput = {
  readonly fullNameAr: string;
  readonly fullNameEn?: string;
  readonly phoneE164: string;
  readonly department: string;
  readonly positionTitle: string;
  readonly jobGrade?: string;
  readonly employmentClass: LeadershipEmploymentClass;
  readonly permissionBundle: LeadershipPermissionBundle;
  readonly officeLocation?: string;
  readonly supervisorActorId?: string;
  readonly engagementStartDate?: string;
  readonly assignmentStartsOn?: string;
  readonly assignmentEndsOn?: string;
  readonly guaranteeType?: "none" | "personal" | "financial" | "institutional";
  readonly guaranteeStatus?: "not_required" | "pending" | "active" | "released" | "forfeited";
  readonly guaranteeReference?: string;
  readonly responsibilityScopes?: readonly string[];
  readonly notes?: string;
};

export type SovereignLeadershipCreationResult = {
  readonly leadership: SovereignLeadershipRecord;
  readonly activation: ActivationCodeResult;
};

export async function getSovereignLeadershipReferenceData(): Promise<SovereignLeadershipReferenceData> {
  return request<SovereignLeadershipReferenceData>("/workforce/sovereign-leadership/reference-data");
}

export async function listSovereignLeadership(): Promise<readonly SovereignLeadershipRecord[]> {
  const result = await request<{ leadership: SovereignLeadershipRecord[] }>("/workforce/sovereign-leadership");
  return result.leadership;
}

export async function createSovereignLeader(input: CreateSovereignLeaderInput): Promise<SovereignLeadershipCreationResult> {
  return request<SovereignLeadershipCreationResult>("/workforce/sovereign-leadership", {
    method: "POST",
    idempotencyKey: corrId("wf-sovereign-leadership"),
    body: input,
  });
}
