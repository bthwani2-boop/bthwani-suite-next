import {
  type DshCaptainRoute,
  getCaptainAvailabilityMeta,
} from './captain.contract';
import type { DshCaptainSurfaceState, DshCaptainSurfaceDerived } from './captain.surface.types';
import {
  buildCaptainBottomActiveIdPolicy,
  buildCaptainHomeTickerPolicy,
  buildCaptainOrderSummaryPolicy,
  buildCaptainPresentationPolicy,
  resolveCaptainDeliveryAction,
} from './captain.derived.policy';
import { ASSIGNMENT_STATUS_LABELS, DELIVERY_STATUS_LABELS, type DshDispatchAssignment } from '../dispatch/dispatch.types';
import type { DshCaptainOrderDetailSummary } from '../orders';

export function buildActiveOrderSummary(
  assignment: DshDispatchAssignment | undefined,
): DshCaptainOrderDetailSummary {
  return buildCaptainOrderSummaryPolicy(
    assignment,
    ASSIGNMENT_STATUS_LABELS,
    DELIVERY_STATUS_LABELS,
  );
}

export function buildCaptainBottomActiveId(
  route: DshCaptainRoute,
  isStoreCourierMode: boolean,
): string {
  return buildCaptainBottomActiveIdPolicy(route, isStoreCourierMode);
}

export function buildCaptainHomeTicker(
  state: Pick<DshCaptainSurfaceState, 'captainAvailabilityStatus' | 'inboxState' | 'activeOrderId'>
    & Partial<Pick<DshCaptainSurfaceState, 'activeWorkItemId'>>,
  activeSummary: DshCaptainOrderDetailSummary,
): DshCaptainSurfaceDerived['homeTicker'] {
  const availabilityMeta = getCaptainAvailabilityMeta(state.captainAvailabilityStatus);
  return buildCaptainHomeTickerPolicy(state, availabilityMeta, activeSummary);
}

export function buildCaptainDerived(
  state: DshCaptainSurfaceState,
  activeAssignment: DshDispatchAssignment | undefined,
): DshCaptainSurfaceDerived {
  const presentation = buildCaptainPresentationPolicy(state, Boolean(activeAssignment));
  const currentAvailabilityMeta = getCaptainAvailabilityMeta(state.captainAvailabilityStatus);
  const activeSummary = buildActiveOrderSummary(activeAssignment);
  const homeTicker = buildCaptainHomeTicker(state, activeSummary);

  return {
    ...presentation,
    currentAvailabilityMeta,
    activeSummary,
    activeDeliveryAction: resolveCaptainDeliveryAction(activeAssignment?.delivery.status),
    homeTicker,
  };
}
