/**
 * Customers see delivery STATUS milestones only.
 * Customers NEVER see captain coordinates, markers, route polylines,
 * last known captain location, or any live/real-time movement data.
 */
export const CUSTOMER_GEO_VISIBILITY_POLICY = {
  canSeeCaptainCoordinates: false,
  canSeeCaptainMarker: false,
  canSeeRoutePolyline: false,
  canSeeLastKnownCaptainLocation: false,
  canSeeOperationalCheckpoints: false,
  canSeeCaptainHeartbeat: false,
  canSeeOrderStatusMilestones: true,
  canSeeEstimatedTextEta: true,
} as const;

export const FORBIDDEN_CLIENT_GEO_SYMBOLS = [
  "latitude",
  "longitude",
  "captainLatitude",
  "captainLongitude",
  "getCaptainLocation",
  "captainMarker",
  "routePolyline",
  "watchPosition",
  "lastKnownCaptainLocation",
  "liveTracking",
  "realTimeTracking",
  "heartbeat",
  "operationalCheckpoints",
] as const;
