export type MapProviderMode = "disabled" | "mock" | "google" | "future_provider";

export type MapsUsageSurface =
  | "app-client"
  | "app-captain"
  | "app-field"
  | "app-partner"
  | "control-panel";

export type GeoCoordinate = {
  readonly latitude: number;
  readonly longitude: number;
};

/**
 * Operational location checkpoint — server-controlled interval, system/operations only.
 * Never exposed to app-client.
 */
export type OperationalLocationCheckpoint = {
  readonly captainId: string;
  readonly recordedAt: string;
  readonly zoneId?: string | null;
};
