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
};

export const DSH_SURFACE_MAP = [
  {
    surface: "app-client",
    capabilityIds: ["dsh.store.discovery", "dsh.client.home-discovery"],
    implementationState: "runtime-verified",
  },
  {
    surface: "app-partner",
    capabilityIds: [],
    implementationState: "planned",
  },
  {
    surface: "app-captain",
    capabilityIds: [],
    implementationState: "planned",
  },
  {
    surface: "app-field",
    capabilityIds: [],
    implementationState: "planned",
  },
  {
    surface: "control-panel",
    capabilityIds: ["dsh.store.discovery"],
    implementationState: "runtime-verified",
  },
] as const satisfies readonly DshSurfaceDefinition[];
