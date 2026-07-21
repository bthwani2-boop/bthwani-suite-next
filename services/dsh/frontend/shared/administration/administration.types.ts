export type DshRole = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly permissions: readonly string[];
  readonly createdAt: string;
};

export type DshStaffMember = {
  readonly id: string;
  readonly actorId: string;
  readonly roleId: string;
  readonly roleName: string;
  readonly assignedBy: string;
  readonly assignedAt: string;
};

export type DshAdministrationApprovalStatus = "pending" | "approved" | "rejected";
export type DshRoleAssignmentApprovalStatus = DshAdministrationApprovalStatus;

export type DshRoleAssignmentApproval = {
  readonly id: string;
  readonly actionType: "staff_role_assignment";
  readonly targetActorId: string;
  readonly roleId: string;
  readonly roleName: string;
  readonly requestedBy: string;
  readonly reason: string;
  readonly status: DshRoleAssignmentApprovalStatus;
  readonly reviewedBy: string;
  readonly reviewNote: string;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly reviewedAt?: string;
};

export type DshRoleDefinitionRequest = {
  readonly id: string;
  readonly roleName: string;
  readonly description: string;
  readonly permissions: readonly string[];
  readonly requestedBy: string;
  readonly reason: string;
  readonly status: DshAdministrationApprovalStatus;
  readonly reviewedBy: string;
  readonly reviewNote: string;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly reviewedAt?: string;
};

export type DshPartnerActivation = {
  readonly id: string;
  readonly partnerId: string;
  readonly status: "submitted" | "ops_approved" | "partner_active" | "blocked";
  readonly reviewedBy: string;
  readonly notes: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshCaptainCredential = {
  readonly id: string;
  readonly captainId: string;
  readonly licenseNumber: string;
  readonly vehicleType: string;
  readonly status: "pending" | "approved" | "rejected" | "suspended";
  readonly reviewedBy: string;
  readonly updatedAt: string;
};

export type DshAdminAuditEntry = {
  readonly id: string;
  readonly actorId: string;
  readonly action: string;
  readonly targetId: string;
  readonly detail: string;
  readonly createdAt: string;
};

export type DshAdminState<T> =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly data: T }
  | { readonly kind: "error"; readonly message: string };
