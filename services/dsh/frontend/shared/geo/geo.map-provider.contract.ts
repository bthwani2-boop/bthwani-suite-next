import type { MapProviderMode, MapsUsageSurface } from "./geo.types";

export type MapsUsageSurfacePermissions = {
  readonly mapTilesAllowed: boolean;
  readonly addressPinAllowed: boolean;
  readonly captainMarkerAllowed: boolean;
  readonly routePolylineAllowed: boolean;
  readonly gpsStreamingAllowed: boolean;
  readonly operationalHeatmapAllowed: boolean;
};

/** app-client: address pin only — NO captain tracking of any kind. */
export const MAPS_SURFACE_POLICY: Record<MapsUsageSurface, MapsUsageSurfacePermissions> = {
  "app-client": {
    mapTilesAllowed: false,
    addressPinAllowed: true,
    captainMarkerAllowed: false,
    routePolylineAllowed: false,
    gpsStreamingAllowed: false,
    operationalHeatmapAllowed: false,
  },
  "app-captain": {
    mapTilesAllowed: true,
    addressPinAllowed: true,
    captainMarkerAllowed: false,
    routePolylineAllowed: true,
    gpsStreamingAllowed: false,
    operationalHeatmapAllowed: true,
  },
  "app-field": {
    mapTilesAllowed: true,
    addressPinAllowed: true,
    captainMarkerAllowed: false,
    routePolylineAllowed: false,
    gpsStreamingAllowed: false,
    operationalHeatmapAllowed: false,
  },
  "app-partner": {
    mapTilesAllowed: true,
    addressPinAllowed: true,
    captainMarkerAllowed: false,
    routePolylineAllowed: false,
    gpsStreamingAllowed: false,
    operationalHeatmapAllowed: false,
  },
  "control-panel": {
    mapTilesAllowed: true,
    addressPinAllowed: true,
    captainMarkerAllowed: false,
    routePolylineAllowed: false,
    gpsStreamingAllowed: false,
    operationalHeatmapAllowed: true,
  },
};

export type MapProviderContract = {
  readonly mode: MapProviderMode;
  readonly surfacePolicy: Record<MapsUsageSurface, MapsUsageSurfacePermissions>;
};

const CURRENT_MAP_PROVIDER_CONTRACT: MapProviderContract = {
  mode: "disabled",
  surfacePolicy: MAPS_SURFACE_POLICY,
};
