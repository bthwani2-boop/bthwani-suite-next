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
  readonly implementationState: "planned" | "runtime-verified" | "blocked";
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
    capabilityIds: ["dsh.store.discovery", "dsh.client.home-discovery"],
    implementationState: "runtime-verified",
  },
  {
    surface: "app-partner",
    capabilityIds: ["dsh.store.discovery"],
    implementationState: "runtime-verified",
    dependencyRole: "downstream",
    dependencyNotes: [
      "Partner readiness and catalog readiness affect future store visibility.",
      "DSH-001 implements Store-only readiness UI; catalog and orders remain excluded.",
    ],
    firstExecutableSlices: ["DSH-003", "DSH-006", "DSH-008"],
  },
  {
    surface: "app-captain",
    capabilityIds: ["dsh.store.discovery"],
    implementationState: "runtime-verified",
    dependencyRole: "none-for-dsh-001",
    dependencyNotes: [
      "Captain interaction starts with assignment, pickup, and delivery.",
      "DSH-001 implements read-only pickup context; delivery lifecycle remains excluded.",
    ],
    firstExecutableSlices: ["DSH-007"],
  },
  {
    surface: "app-field",
    capabilityIds: ["dsh.store.discovery"],
    implementationState: "runtime-verified",
    dependencyRole: "upstream",
    dependencyNotes: [
      "Field onboarding and visit evidence can qualify stores for approval.",
      "DSH-001 implements Store-only verification context; field workflow remains excluded.",
    ],
    firstExecutableSlices: ["DSH-008"],
  },
  {
    surface: "control-panel",
    capabilityIds: ["dsh.store.discovery"],
    implementationState: "runtime-verified",
  },
] as const satisfies readonly DshSurfaceDefinition[];
