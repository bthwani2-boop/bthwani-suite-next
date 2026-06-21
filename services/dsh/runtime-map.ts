import type { DshCapability } from "./capability-map";

export type DshRuntimeBinding = {
  readonly capabilityId: DshCapability["id"];
  readonly contractOperations: readonly string[];
  readonly backendImplemented: boolean;
  readonly runtimeEvidence: string | null;
  readonly state: "blocked" | "verified";
};

export const DSH_RUNTIME_MAP = [
  {
    capabilityId: "dsh.system.readiness",
    contractOperations: ["getDshHealth", "getDshReadiness"],
    backendImplemented: true,
    runtimeEvidence: "services/dsh/evidence/DSH-001-store-discovery",
    state: "verified",
  },
  {
    capabilityId: "dsh.store.discovery",
    contractOperations: ["listDshStores", "getDshStore"],
    backendImplemented: true,
    runtimeEvidence: "services/dsh/evidence/DSH-001-store-discovery",
    state: "verified",
  },
] as const satisfies readonly DshRuntimeBinding[];
