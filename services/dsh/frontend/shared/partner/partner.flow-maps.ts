// Partner operational flow ↔ support route mapping utilities.
// No JSX. No ui-kit. No Tamagui.

import type { DshPartnerOperationalFlowId, DshPartnerSupportRouteId } from './partner.types';
import {
  DSH_PARTNER_OPERATIONAL_FLOW_TO_SUPPORT_ROUTE,
  DSH_PARTNER_SUPPORT_ROUTE_TO_OPERATIONAL_FLOW,
} from './partner.types';

export function mapDshPartnerOperationalFlowToSupportRoute(
  flowId: DshPartnerOperationalFlowId,
): DshPartnerSupportRouteId | null {
  return DSH_PARTNER_OPERATIONAL_FLOW_TO_SUPPORT_ROUTE[flowId];
}

export function mapDshPartnerSupportRouteToOperationalFlow(
  routeId: DshPartnerSupportRouteId,
): DshPartnerOperationalFlowId | null {
  return DSH_PARTNER_SUPPORT_ROUTE_TO_OPERATIONAL_FLOW[routeId];
}

