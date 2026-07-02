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
    | "none-for-store-discovery";
  readonly dependencyNotes?: readonly string[];
  readonly firstExecutableJourneys?: readonly string[];
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
      "Store Discovery owns store role context; Catalog Management owns catalog CRUD and submission workflow.",
    ],
    firstExecutableJourneys: ["orders", "field-readiness"],
  },
  {
    surface: "app-captain",
    capabilityIds: ["dsh.store.discovery", "dsh.client.dispatch"],
    implementationState: "runtime-verified",
    dependencyRole: "none-for-store-discovery",
    dependencyNotes: [
      "Captain interaction starts with assignment, pickup, and delivery.",
      "Store Discovery requires pickup-point readiness reporting; delivery lifecycle remains excluded.",
    ],
    firstExecutableJourneys: ["dispatch"],
  },
  {
    surface: "app-field",
    capabilityIds: ["dsh.store.discovery", "dsh.field.readiness"],
    implementationState: "runtime-verified",
    dependencyRole: "upstream",
    dependencyNotes: [
      "Field onboarding and visit evidence can qualify stores for approval.",
      "Store Discovery requires assigned-store verification submission; broader field workflow remains excluded.",
    ],
    firstExecutableJourneys: ["field-readiness"],
  },
  {
    surface: "control-panel",
    capabilityIds: ["dsh.store.discovery", "dsh.client.home-discovery", "dsh.client.catalog", "dsh.client.cart", "dsh.client.checkout", "dsh.client.orders", "dsh.client.dispatch", "dsh.field.readiness", "dsh.support.hub", "dsh.operator.analytics"],
    implementationState: "runtime-verified",
  },
] as const satisfies readonly DshSurfaceDefinition[];
