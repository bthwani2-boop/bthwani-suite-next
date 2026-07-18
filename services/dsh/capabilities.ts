import { DSH_CAPABILITY_MAP, type DshCapability } from "./capability-map";
import {
  DSH_CAPABILITY_MAP_EXTENSIONS,
  type DshCapabilityExtension,
} from "./capability-map.extensions";

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
const extensionByCapabilityId = new Map<DshCapability["id"], DshCapabilityExtension>();

for (const extension of DSH_CAPABILITY_MAP_EXTENSIONS) {
  if (!baseCapabilityIds.has(extension.id)) {
    throw new Error(
      `ORPHAN_DSH_CAPABILITY_EXTENSION: ${extension.id} has no canonical capability owner`,
    );
  }
  if (extensionByCapabilityId.has(extension.id)) {
    throw new Error(
      `DUPLICATE_DSH_CAPABILITY_EXTENSION: ${extension.id} has more than one extension`,
    );
  }
  extensionByCapabilityId.set(extension.id, extension);
}

export const DSH_CAPABILITIES = DSH_CAPABILITY_MAP.map((capability) =>
  mergeCapabilityExtension(capability, extensionByCapabilityId.get(capability.id)),
);

export const DSH_CAPABILITY_IDS = DSH_CAPABILITIES.map((capability) => capability.id);

export const DSH_CONTRACT_OPERATIONS = unique(
  DSH_CAPABILITIES.flatMap((capability) => capability.contractOperations),
);

export function getDshCapabilitiesForSurface(surface: string) {
  return DSH_CAPABILITIES.filter((capability) => capability.surfaces.includes(surface));
}
