import type { DshCapability } from "./capability-map";

export type DshSurface =
  | "app-client"
  | "app-partner"
  | "app-captain"
  | "app-field"
  | "control-panel";

export type DshSurfaceDefinition = {
  readonly surface: DshSurface;
  readonly capabilityIds: readonly DshCapability["id"][];
  readonly implementationState: "planned" | "runtime-verified" | "fix-required" | "blocked";
  readonly dependencyRole?:
    | "none"
    | "upstream"
    | "downstream"
    | "none-for-dsh-001";
  readonly dependencyNotes?: readonly string[];
  readonly firstExecutableSlices?: readonly string[];
};

export const DSH_SURFACE_MAP = [
  {
    surface: "app-client",
    capabilityIds: ["dsh.store.discovery", "dsh.client.home-discovery", "dsh.client.catalog", "dsh.client.cart", "dsh.client.checkout", "dsh.client.orders", "dsh.client.dispatch"],
    implementationState: "runtime-verified",
  },
  {
    surface: "app-partner",
    capabilityIds: ["dsh.store.discovery", "dsh.client.catalog", "dsh.client.orders", "dsh.field.readiness", "dsh.support.hub", "dsh.operator.analytics"],
    implementationState: "runtime-verified",
    dependencyRole: "downstream",
    dependencyNotes: [
      "Partner manages own-store catalog; catalog readiness affects store publication eligibility.",
      "DSH-001 owns store role context; DSH-003 owns catalog CRUD and submission workflow.",
    ],
    firstExecutableSlices: ["DSH-006", "DSH-008"],
  },
  {
    surface: "app-captain",
    capabilityIds: ["dsh.store.discovery", "dsh.client.dispatch"],
    implementationState: "runtime-verified",
    dependencyRole: "none-for-dsh-001",
    dependencyNotes: [
      "Captain interaction starts with assignment, pickup, and delivery.",
      "DSH-001 requires pickup-point readiness reporting; delivery lifecycle remains excluded.",
    ],
    firstExecutableSlices: ["DSH-007"],
  },
  {
    surface: "app-field",
    capabilityIds: ["dsh.store.discovery", "dsh.field.readiness"],
    implementationState: "runtime-verified",
    dependencyRole: "upstream",
    dependencyNotes: [
      "Field onboarding and visit evidence can qualify stores for approval.",
      "DSH-001 requires assigned-store verification submission; broader field workflow remains excluded.",
    ],
    firstExecutableSlices: ["DSH-008"],
  },
  {
    surface: "control-panel",
    capabilityIds: ["dsh.store.discovery", "dsh.client.home-discovery", "dsh.client.catalog", "dsh.client.cart", "dsh.client.checkout", "dsh.client.orders", "dsh.client.dispatch", "dsh.field.readiness", "dsh.support.hub", "dsh.operator.analytics"],
    implementationState: "runtime-verified",
  },
] as const satisfies readonly DshSurfaceDefinition[];
