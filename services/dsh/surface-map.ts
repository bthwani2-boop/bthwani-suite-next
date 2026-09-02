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
  readonly dependencyRole?:
    | "none"
    | "upstream"
    | "downstream"
    | "none-for-store-discovery";
  readonly dependencyNotes?: readonly string[];
};

function capabilityIdsFor(surface: DshSurface): readonly DshCapability["id"][] {
  return getDshCapabilitiesForSurface(surface).map((capability) => capability.id);
}

/**
 * Surface coverage is derived from canonical capability ownership.
 * Structural topology and dependencies only; runtime verification and campaign
 * execution plans live in evidence and plan artifacts.
 */
export const DSH_SURFACE_MAP = [
  {
    surface: "app-client",
    capabilityIds: capabilityIdsFor("app-client"),
  },
  {
    surface: "app-partner",
    capabilityIds: capabilityIdsFor("app-partner"),
    dependencyRole: "downstream",
    dependencyNotes: [
      "Partner manages own-store catalog; catalog readiness affects store publication eligibility.",
      "Store Discovery owns store role context; Catalog Management owns catalog CRUD and submission workflow.",
    ],
  },
  {
    surface: "app-captain",
    capabilityIds: capabilityIdsFor("app-captain"),
    dependencyRole: "none-for-store-discovery",
    dependencyNotes: [
      "Captain interaction starts with assignment, pickup, delivery, COD, and payout-reference journeys.",
      "Store Discovery owns pickup context; WLT remains the only owner of financial truth.",
    ],
  },
  {
    surface: "app-field",
    capabilityIds: capabilityIdsFor("app-field"),
    dependencyRole: "upstream",
    dependencyNotes: [
      "Field onboarding and visit evidence can qualify stores for approval.",
      "Field finance is reference-only through the DSH/WLT boundary and cannot own wallet truth.",
    ],
  },
  {
    surface: "control-panel",
    capabilityIds: capabilityIdsFor("control-panel"),
  },
] as const satisfies readonly DshSurfaceDefinition[];
