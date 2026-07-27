import { corrId, createDshHttpClient } from "../_kernel/dsh-http-request";
import type { ActivationCodeResult, Employee } from "./workforce.types";

const { request } = createDshHttpClient("/api/workforce", "workforce", 15000);

export type LeadershipEmploymentClass = "coordinator" | "department_manager" | "executive" | "project_manager";
export type LeadershipPermissionBundle =
  | "platform_owner"
  | "platform_coordinator"
  | "operations_manager"
  | "partners_manager"
  | "finance_manager"
  | "support_manager"
  | "hr_manager";

export type SovereignLeadershipGovernance = {
  readonly actorId: string;
  readonly positionTitle: string;
  readonly jobGrade: string;
  readonly employmentClass: LeadershipEmploymentClass;
  readonly guaranteeType: string;
  readonly guaranteeStatus: string;
  readonly guaranteeReference?: string;
  readonly responsibilityScopes: readonly string[];
  readonly authorityScopes: readonly string[];
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
