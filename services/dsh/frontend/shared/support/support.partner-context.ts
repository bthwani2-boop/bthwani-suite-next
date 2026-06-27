import {
  type DshPartnerOperationalFlowId,
  type DshPartnerSupportCommandContext,
  type DshPartnerSupportRouteId,
} from '../partner/partner.types';
import {
  mapDshPartnerOperationalFlowToSupportRoute,
  mapDshPartnerSupportRouteToOperationalFlow,
} from '../partner/partner.flow-maps';
import {
  resolveIssueCategoryFromOperationalFlow,
  resolveIssueCategoryFromRoute,
  resolveSupportFilterFromOperationalFlow,
  resolveSupportFilterFromRoute,
} from './support.partner-policies';

export const defaultSupportCommandContext: DshPartnerSupportCommandContext = {
  filterId: 'all',
  highlightedCaseId: null,
  highlightedIssueCategoryId: null,
  preferredOperationalFlowId: null,
  preferredSupportRouteId: null,
  source: 'operations',
};

export function buildSupportCommandContextFromOperationalFlow(
  flowId: DshPartnerOperationalFlowId,
  source: DshPartnerSupportCommandContext['source'] = 'operations',
): DshPartnerSupportCommandContext {
  return {
    filterId: resolveSupportFilterFromOperationalFlow(flowId),
    highlightedCaseId: null,
    highlightedIssueCategoryId: resolveIssueCategoryFromOperationalFlow(flowId),
    preferredOperationalFlowId: flowId,
    preferredSupportRouteId: mapDshPartnerOperationalFlowToSupportRoute(flowId),
    source,
  };
}

export function buildSupportCommandContextFromSupportRoute(
  routeId: DshPartnerSupportRouteId,
  source: DshPartnerSupportCommandContext['source'] = 'operations',
): DshPartnerSupportCommandContext {
  return {
    filterId: resolveSupportFilterFromRoute(routeId),
    highlightedCaseId: null,
    highlightedIssueCategoryId: resolveIssueCategoryFromRoute(routeId),
    preferredOperationalFlowId: mapDshPartnerSupportRouteToOperationalFlow(routeId),
    preferredSupportRouteId: routeId,
    source,
  };
}
