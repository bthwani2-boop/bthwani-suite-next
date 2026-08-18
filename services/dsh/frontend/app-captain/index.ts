/**
 * DSH Captain App Public API.
 *
 * This is the only supported composition boundary for app-captain. Runtime
 * shells must import through @bthwani/dsh/app-captain instead of reaching into
 * services/dsh by relative filesystem path.
 */

export { DshCaptainSurface } from "./DshCaptainSurface";

export type {
  DshCaptainCommandTarget,
  DshCaptainNavigationCommand,
  DshCaptainRoute,
  DshCaptainSurfaceProps,
  DshCaptainState,
  DshCaptainStateGroup,
  DshCaptainStateMeta,
  DshCaptainProfileSnapshot,
} from "./dsh-captain.types";

export type {
  DshCaptainLegacyRoute,
  DshCaptainRouteId,
  DshCaptainRouteRecord,
} from "./dsh-captain.routes";

export type { DshCaptainScreenRegistryItem } from "./dsh-captain.screen-registry";

export { captainNavigationTargetFromDeepLink } from "../shared/delivery/captain-deep-link";
export { IdentitySessionGate } from "../shared/session/IdentitySessionGate";
export { useDshMobilePushRegistration } from "../shared/notifications/use-mobile-push-registration";
export {
  WorkforceAccessGate,
  WorkforceProfileProvider,
  useWorkforceProfile,
} from "../shared/workforce";
export {
  fetchCaptainOperationalReadiness,
  type CaptainOperationalReadiness,
} from "./captain-readiness.api";
