import {
  DSH_CAPABILITIES,
  DSH_CAPABILITY_IDS,
} from "./capabilities";
import { DSH_SURFACE_MAP } from "./surface-map";

export const dshServiceManifest = {
  service: "dsh",
  id: "dsh",
  name: "Direct Store Handoff / Commerce Orchestration",

  realService: true,
  activatesService: true,

  type: "DOMAIN_ORCHESTRATION_SERVICE",
  lifecycle: "ACTIVE",

  activationScope:
    "stores-home-discovery-catalog-cart-checkout-wlt-handoff-orders-dispatch-field-readiness-support-analytics-notifications-finance-special-requests-pickup-partner-delivery",
  capabilityIds: DSH_CAPABILITY_IDS,
  capabilities: DSH_CAPABILITIES,
  surfaces: DSH_SURFACE_MAP,
} as const;

export default dshServiceManifest;

