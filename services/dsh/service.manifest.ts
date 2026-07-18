import { DSH_CAPABILITY_MAP, type DshCapability } from "./capability-map";
import {
  DSH_CAPABILITY_MAP_EXTENSIONS,
  type DshCapabilityExtension,
} from "./capability-map.extensions";
import { DSH_RUNTIME_MAP } from "./runtime-map";
import { DSH_SURFACE_MAP } from "./surface-map";

function unique<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}

function mergeCapabilityExtension(
  capability: DshCapability,
  extension: DshCapabilityExtension | undefined,
): DshCapability {
  if (!extension) return capability;

  return {
    ...capability,
    status: extension.status,
    contractOperations: unique([
      ...capability.contractOperations,
      ...extension.contractOperations,
    ]),
    surfaces: unique([...capability.surfaces, ...extension.surfaces]),
    runtimeBound: capability.runtimeBound && extension.runtimeBound,
    closureState: extension.closureState,
    topic: extension.topic ?? capability.topic,
    topicScope: unique([
      ...(capability.topicScope ?? []),
      ...extension.topicScope,
    ]) as DshCapability["topicScope"],
  };
}

const baseCapabilityIds = new Set(DSH_CAPABILITY_MAP.map((capability) => capability.id));
for (const extension of DSH_CAPABILITY_MAP_EXTENSIONS) {
  if (!baseCapabilityIds.has(extension.id)) {
    throw new Error(
      `ORPHAN_DSH_CAPABILITY_EXTENSION: ${extension.id} has no canonical capability owner`,
    );
  }
}

const extensionByCapabilityId = new Map(
  DSH_CAPABILITY_MAP_EXTENSIONS.map((extension) => [extension.id, extension] as const),
);

export const DSH_CAPABILITIES = DSH_CAPABILITY_MAP.map((capability) =>
  mergeCapabilityExtension(capability, extensionByCapabilityId.get(capability.id)),
);

export const DSH_CONTRACT_OPERATIONS = unique(
  DSH_CAPABILITIES.flatMap((capability) => capability.contractOperations),
);

export const dshServiceManifest = {
  service: "dsh",
  realService: true,
  activatesService: true,
  runtimeState: "PARTIALLY_BOUND",
  closureState: "FIX_REQUIRED",
  activationScope:
    "stores-home-discovery-catalog-cart-checkout-wlt-handoff-orders-dispatch-field-readiness-support-analytics-notifications-finance-special-requests-pickup-partner-delivery",
  contract: "contracts/dsh.openapi.yaml",
  contracts: [
    "contracts/dsh.openapi.yaml",
    "contracts/dsh.catalog.openapi.yaml",
    "contracts/dsh.marketing-commercial.openapi.yaml",
    "contracts/dsh.partner-fleet.openapi.yaml",
  ],
  contractFragments: {
    centralCatalog: "contracts/dsh.catalog.openapi.yaml",
    marketingCommercial: "contracts/dsh.marketing-commercial.openapi.yaml",
    partnerFleet: "contracts/dsh.partner-fleet.openapi.yaml",
  },
  contractState: "CONTRACT_ACTIVE",
  capabilityIds: DSH_CAPABILITIES.map((capability) => capability.id),
  capabilities: DSH_CAPABILITIES,
  surfaces: DSH_SURFACE_MAP,
  runtime: DSH_RUNTIME_MAP,
  currentTruth: {
    contractOperations: DSH_CONTRACT_OPERATIONS,
    catalogContract: {
      path: "contracts/dsh.catalog.openapi.yaml",
      state: "CONTRACT_ACTIVE",
      optimisticConcurrency: "REQUIRED",
      conflictStatus: 409,
      clientGeneration: "ENABLED",
    },
    backendRuntimeReady: true,
    generatedClientReady: true,
    databaseReady: true,
    screensReady: false,
    technicalRuntimeReady: false,
    realExperienceReady: false,
    platformControlRuntimeState: "VERIFICATION_REQUIRED",
    platformControlReason:
      "core/platform-control P3 governed changes, live health, progressive rollout, audit, and rollback are implemented; same-commit runtime and independent release evidence remain required.",
  },
} as const;
