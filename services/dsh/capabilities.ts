import { DSH_CAPABILITY_MAP, type DshCapability } from "./capability-map";

function unique<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}

export const DSH_CAPABILITIES = DSH_CAPABILITY_MAP;

export const DSH_CAPABILITY_IDS = DSH_CAPABILITIES.map((capability) => capability.id);

export const DSH_CONTRACT_OPERATIONS = unique(
  DSH_CAPABILITIES.flatMap((capability) => capability.contractOperations),
);

export function getDshCapabilitiesForSurface(surface: string) {
  return DSH_CAPABILITIES.filter((capability) => capability.surfaces.some((candidate) => candidate === surface));
}
