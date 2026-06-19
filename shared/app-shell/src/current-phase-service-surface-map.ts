import type { CurrentPhaseServiceName } from "./services";

export const CURRENT_PHASE_SERVICE_SURFACE_MAP = {
  dsh: [
    "app-client",
    "app-partner",
    "app-captain",
    "app-field",
    "control-panel",
  ],
  wlt: ["app-client", "control-panel"],
} as const;

export type CurrentPhaseServiceSurfaceMap =
  typeof CURRENT_PHASE_SERVICE_SURFACE_MAP;

export type CurrentPhaseSurfaceForService<
  Service extends CurrentPhaseServiceName,
> = CurrentPhaseServiceSurfaceMap[Service][number];

export function isSurfaceEnabledForCurrentPhaseService<
  Service extends CurrentPhaseServiceName,
>(
  service: Service,
  surface: string,
): surface is CurrentPhaseSurfaceForService<Service> {
  return (
    CURRENT_PHASE_SERVICE_SURFACE_MAP[service] as readonly string[]
  ).includes(surface);
}
