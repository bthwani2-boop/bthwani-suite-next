import type { MapsUsageSurface } from "./geo.types";

export const OPERATIONAL_CHECKPOINT_POLICY = {
  defaultIntervalSeconds: 300,
  minIntervalSeconds: 300,
  streamingAllowed: false,
  watchPositionAllowed: false,
  backgroundContinuousTrackingAllowed: false,
  allowedConsumers: ["control-panel", "system"] as readonly MapsUsageSurface[],
  forbiddenConsumers: ["app-client"] as readonly MapsUsageSurface[],
} as const;

type OperationalCheckpointPolicy = typeof OPERATIONAL_CHECKPOINT_POLICY;

type CheckpointSubmissionResult =
  | { readonly kind: "accepted"; readonly nextAllowedAt: string }
  | { readonly kind: "throttled"; readonly nextAllowedAt: string }
  | { readonly kind: "forbidden"; readonly reason: string };
