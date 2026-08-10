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
  type CaptainHomeTickerAction,
} from './captain.derived.policy';
import { ASSIGNMENT_STATUS_LABELS, DELIVERY_STATUS_LABELS, type DshDispatchAssignment } from '../dispatch/dispatch.types';
import type { DshCaptainOrderDetailSummary } from '../orders';

export type CaptainDerivedCallbacks = {
  readonly toggleAvailability: () => void;
  readonly goToInbox: () => void;
  readonly resetInboxState: () => void;
  readonly toggleOrderExpanded: () => void;
};

function resolveTickerCallback(
  action: CaptainHomeTickerAction,
  callbacks: CaptainDerivedCallbacks,
): () => void {
  if (action === 'toggle-availability') return callbacks.toggleAvailability;
  if (action === 'reset-inbox') return callbacks.resetInboxState;
  if (action === 'toggle-order') return callbacks.toggleOrderExpanded;
  return callbacks.goToInbox;
}

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
  state: Pick<DshCaptainSurfaceState, 'captainAvailabilityStatus' | 'inboxState' | 'activeOrderId'>,
  callbacks: CaptainDerivedCallbacks,
  activeSummary: DshCaptainOrderDetailSummary,
): DshCaptainSurfaceDerived['homeTicker'] {
  const availabilityMeta = getCaptainAvailabilityMeta(state.captainAvailabilityStatus);
  const policy = buildCaptainHomeTickerPolicy(state, availabilityMeta, activeSummary);
  return {
    statusLabel: policy.statusLabel,
    message: policy.message,
    onPress: resolveTickerCallback(policy.action, callbacks),
    marquee: policy.marquee,
  };
}

export function buildCaptainDerived(
  state: DshCaptainSurfaceState,
  callbacks: CaptainDerivedCallbacks,
  activeAssignment: DshDispatchAssignment | undefined,
): DshCaptainSurfaceDerived {
  // Presentation gating only. A live actor-scoped DSH assignment is required
  // before the PoD route is shown; the PoD endpoint remains authoritative for
  // whether the submitted mutation is valid.
  const presentation = buildCaptainPresentationPolicy(state, Boolean(activeAssignment));
  const currentAvailabilityMeta = getCaptainAvailabilityMeta(state.captainAvailabilityStatus);
  const activeSummary = buildActiveOrderSummary(activeAssignment);
  const homeTicker = buildCaptainHomeTicker(state, callbacks, activeSummary);

  return {
    ...presentation,
    currentAvailabilityMeta,
    activeSummary,
    homeTicker,
  };
}
