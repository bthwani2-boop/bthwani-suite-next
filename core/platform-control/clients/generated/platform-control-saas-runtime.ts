/**
 * Generated contract extension for platform-control.saas.overlay.yaml.
 * Keep this file aligned with the overlay and the Go saasRuntimeStatus JSON tags.
 */
import type { components } from "./platform-control-api";

export type PlatformSaasRuntimeStatus = {
  mode: "active" | "deferred";
  commercialActivationState: "blocked" | "eligible" | "authorized" | "active";
  productionDeploymentAuthorized: boolean;
  defaultTenantId: string;
  runtimeEnabled: boolean;
};

export type PlatformRuntimeSnapshotWithSaaS =
  components["schemas"]["PlatformRuntimeSnapshot"] & {
    saas: PlatformSaasRuntimeStatus;
  };
