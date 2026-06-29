/**
 * DSH Captain Navigation Bridge — re-export barrel.
 */
export type {
  DshCaptainLifecycleState,
  DshCaptainRouteMapping,
  DshCaptainOrderStageMapping,
  DshCaptainInboxModeFilter,
} from '../shared/delivery';

export {
  DSH_CAPTAIN_ROUTE_MAP,
  getCaptainRouteForLifecycle,
  DSH_CAPTAIN_ORDER_STAGE_MAP,
  getCaptainLifecycleForOrderStage,
  DSH_CAPTAIN_INBOX_MODE_FILTERS,
  isCaptainInboxVisibleForMode,
  getCaptainActionableHandoffs,
} from '../shared/delivery';

export type {
  DshCaptainCodState,
  DshCaptainCodEntry,
} from '../shared/delivery';

export {
  DSH_CAPTAIN_COD_STATE_META,
  buildCaptainCodEntry,
} from '../shared/delivery';

export type { DshCaptainPodDownstreamTarget } from '../shared/media/captain-pod-downstream';
export { DSH_CAPTAIN_POD_DOWNSTREAM } from '../shared/media/captain-pod-downstream';

export type { DshCaptainSupportEscalationContext } from '../shared/support/support.captain-escalation';
export {
  DSH_CAPTAIN_SUPPORT_ESCALATION_MAP,
  getCaptainEscalationContext,
} from '../shared/support/support.captain-escalation';
