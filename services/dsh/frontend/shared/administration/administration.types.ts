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
