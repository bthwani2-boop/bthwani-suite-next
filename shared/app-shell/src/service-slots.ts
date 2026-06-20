import type { CurrentPhaseSurfaceForService } from "./current-phase-service-surface-map";
import type { CurrentPhaseServiceName } from "./services";

export type ServiceFrontendRoot<
  Service extends CurrentPhaseServiceName,
  Surface extends CurrentPhaseSurfaceForService<Service>,
> = `services/${Service}/frontend/${Surface}`;

export type ServiceSlotContract<
  Service extends CurrentPhaseServiceName,
  Surface extends CurrentPhaseSurfaceForService<Service>,
> = {
  readonly service: Service;
  readonly surface: Surface;
  readonly frontendRoot: ServiceFrontendRoot<Service, Surface>;
};

export function makeServiceFrontendRoot<
  Service extends CurrentPhaseServiceName,
  Surface extends CurrentPhaseSurfaceForService<Service>,
>(
  service: Service,
  surface: Surface,
): ServiceFrontendRoot<Service, Surface> {
  return `services/${service}/frontend/${surface}` as ServiceFrontendRoot<
    Service,
    Surface
  >;
}

export function makeServiceSlotContract<
  Service extends CurrentPhaseServiceName,
  Surface extends CurrentPhaseSurfaceForService<Service>,
>(
  service: Service,
  surface: Surface,
): ServiceSlotContract<Service, Surface> {
  return {
    service,
    surface,
    frontendRoot: makeServiceFrontendRoot(service, surface),
  };
}
