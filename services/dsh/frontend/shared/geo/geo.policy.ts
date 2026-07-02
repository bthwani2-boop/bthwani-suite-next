export const DSH_GEO_POLICY = {
  customerCaptainTrackingForbidden: true,
  continuousGpsStreamingForbidden: true,
  minimumCheckpointIntervalSeconds: 300,
  checkpointConsumersAllowed: ["control-panel", "system"] as const,
  wltDoesNotOwnGeoCordinates: true,
  mapsKeysOwnedByPlatformRegistry: true,
} as const;

export type DshGeoPolicy = typeof DSH_GEO_POLICY;
