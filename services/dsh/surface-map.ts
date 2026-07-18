import type { DshCapability } from "./capability-map";
import { getDshCapabilitiesForSurface } from "./capabilities";

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

function capabilityIdsFor(surface: DshSurface): readonly DshCapability["id"][] {
  return getDshCapabilitiesForSurface(surface).map((capability) => capability.id);
}

/**
 * Surface coverage is derived from canonical capability ownership. A surface
 * remains `fix-required` until actor-specific navigation, permissions, network
 * execution, persistence, readback, and negative paths are verified on the same
 * immutable commit. Static imports or historical evidence cannot promote it to
 * `runtime-verified`.
 */
export const DSH_SURFACE_MAP = [
  {
    surface: "app-client",
    capabilityIds: capabilityIdsFor("app-client"),
    implementationState: "fix-required",
  },
  {
    surface: "app-partner",
    capabilityIds: capabilityIdsFor("app-partner"),
    implementationState: "fix-required",
    dependencyRole: "downstream",
    dependencyNotes: [
      "Partner manages own-store catalog; catalog readiness affects store publication eligibility.",
      "Store Discovery owns store role context; Catalog Management owns catalog CRUD and submission workflow.",
    ],
    firstExecutableJourneys: ["orders", "field-readiness", "notifications"],
  },
  {
    surface: "app-captain",
    capabilityIds: capabilityIdsFor("app-captain"),
    implementationState: "fix-required",
    dependencyRole: "none-for-store-discovery",
    dependencyNotes: [
      "Captain interaction starts with assignment, pickup, delivery, COD, and payout-reference journeys.",
      "Store Discovery owns pickup context; WLT remains the only owner of financial truth.",
    ],
    firstExecutableJourneys: ["dispatch", "field-finance", "notifications"],
  },
  {
    surface: "app-field",
    capabilityIds: capabilityIdsFor("app-field"),
    implementationState: "fix-required",
    dependencyRole: "upstream",
    dependencyNotes: [
      "Field onboarding and visit evidence can qualify stores for approval.",
      "Field finance is reference-only through the DSH/WLT boundary and cannot own wallet truth.",
    ],
    firstExecutableJourneys: ["field-readiness", "field-finance", "notifications"],
  },
  {
    surface: "control-panel",
    capabilityIds: capabilityIdsFor("control-panel"),
    implementationState: "fix-required",
  },
] as const satisfies readonly DshSurfaceDefinition[];
