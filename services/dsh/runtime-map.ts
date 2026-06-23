import type { DshCapability } from "./capability-map";

export type DshRuntimeBinding = {
  readonly capabilityId: DshCapability["id"];
  readonly contractOperations?: readonly string[];
  readonly backendImplemented: boolean;
  readonly runtimeEvidence: string | null;
  readonly state: "blocked" | "verified" | "experience-fix-required" | "client-reverified-only";
  readonly runtimeBound?: boolean;
  readonly screensReady?: boolean;
  readonly databaseReady?: boolean;
  readonly generatedClientReady?: boolean;
};

export const DSH_RUNTIME_MAP = [
  {
    capabilityId: "dsh.system.readiness",
    contractOperations: ["getDshHealth", "getDshReadiness"],
    backendImplemented: true,
    runtimeEvidence: "services/dsh/evidence/DSH-001-store-discovery-fullstack-multi-surface",
    state: "verified",
  },
  {
    capabilityId: "dsh.store.discovery",
    contractOperations: ["listDshStores", "getDshStore"],
    backendImplemented: true,
    runtimeEvidence: "services/dsh/evidence/DSH-001-store-discovery-fullstack-multi-surface",
    state: "verified",
  },
  {
    capabilityId: "dsh.client.home-discovery",
    backendImplemented: true,
    runtimeBound: true,
    screensReady: true,
    databaseReady: true,
    generatedClientReady: true,
    state: "client-reverified-only",
    runtimeEvidence: "services/dsh/evidence/DSH-002-client-home-discovery",
  },
  {
    capabilityId: "dsh.client.catalog",
    backendImplemented: true,
    runtimeBound: true,
    screensReady: true,
    databaseReady: true,
    generatedClientReady: true,
    state: "verified",
    runtimeEvidence: "services/dsh/evidence/DSH-003-catalog-fullstack",
  },
] as const satisfies readonly DshRuntimeBinding[];
