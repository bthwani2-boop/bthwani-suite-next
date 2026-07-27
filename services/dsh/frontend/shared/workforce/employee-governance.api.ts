import { corrId, createDshHttpClient } from "../_kernel/dsh-http-request";

const { request } = createDshHttpClient("/api/workforce", "workforce", 15000);

export type EmployeeEmploymentClass = "staff" | "coordinator" | "department_manager" | "executive" | "project_manager";
export type EmployeeGuaranteeType = "none" | "personal" | "financial" | "institutional";
export type EmployeeGuaranteeStatus = "not_required" | "pending" | "active" | "released" | "forfeited";

export type EmployeeGovernanceProfile = {
  readonly actorId: string;
  readonly positionTitle: string;
  readonly jobGrade: string;
  readonly employmentClass: EmployeeEmploymentClass;
  readonly guaranteeType: EmployeeGuaranteeType;
  readonly guaranteeStatus: EmployeeGuaranteeStatus;
  readonly guaranteeReference?: string;
  readonly responsibilityScopes: readonly string[];
  readonly authorityScopes: readonly string[];
  readonly managedDepartmentCodes: readonly string[];
  readonly notes?: string;
  readonly updatedByActorId: string;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type UpsertEmployeeGovernanceInput = {
  readonly expectedVersion: number;
  readonly positionTitle: string;
  readonly jobGrade: string;
  readonly employmentClass: EmployeeEmploymentClass;
  readonly guaranteeType: EmployeeGuaranteeType;
  readonly guaranteeStatus: EmployeeGuaranteeStatus;
  readonly guaranteeReference: string;
  readonly responsibilityScopes: readonly string[];
  readonly authorityScopes: readonly string[];
  readonly managedDepartmentCodes: readonly string[];
  readonly notes: string;
};

export async function getEmployeeGovernance(actorId: string): Promise<EmployeeGovernanceProfile> {
  const result = await request<{ employeeGovernance: EmployeeGovernanceProfile }>(
    `/workforce/employees/${encodeURIComponent(actorId)}/governance`,
  );
  return result.employeeGovernance;
}

export async function putEmployeeGovernance(
  actorId: string,
  input: UpsertEmployeeGovernanceInput,
): Promise<EmployeeGovernanceProfile> {
  const result = await request<{ employeeGovernance: EmployeeGovernanceProfile }>(
    `/workforce/employees/${encodeURIComponent(actorId)}/governance`,
    {
      method: "PUT",
      idempotencyKey: corrId("wf-employee-governance"),
      body: input,
    },
  );
  return result.employeeGovernance;
}
