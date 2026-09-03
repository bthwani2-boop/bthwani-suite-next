/**
 * DSH Captain App Public API.
 *
 * This is the only supported composition boundary for app-captain. Runtime
 * shells must import through @bthwani/dsh/app-captain instead of reaching into
 * services/dsh by relative filesystem path.
 */

export { DshCaptainApplication } from "./DshCaptainApplication";
export type { DshCaptainApplicationProps } from "./DshCaptainApplication";
export { DshCaptainSurface } from "./DshCaptainSurface";

export type {
  DshCaptainRoute,
  DshCaptainSurfaceProps,
} from "./dsh-captain.types";

export {
  DSH_CAPTAIN_ACCOUNT_SECTIONS,
  DSH_CAPTAIN_SUPPORT_ROUTES,
  dshCaptainRouteFromNavigation,
  dshCaptainRouteAssignmentId,
  dshCaptainRouteSupportScreen,
  dshCaptainRouteToPath,
  parseDshCaptainAccountSection,
  parseDshCaptainSupportRoute,
} from "./captain-navigation";
export type {
  DshCaptainAccountSection,
  DshCaptainNavigation,
  DshCaptainNavigationMode,
  DshCaptainNavigationRoute,
} from "./captain-navigation";

export type {
  DshCaptainRouteId,
  DshCaptainRouteRecord,
} from "./dsh-captain.routes";

export type { DshCaptainScreenRegistryItem } from "./dsh-captain.screen-registry";

export { IdentitySessionGate } from "../shared/session/IdentitySessionGate";
export { useDshMobilePushRegistration } from "../shared/notifications/use-mobile-push-registration";
export {
  WorkforceAccessGate,
  WorkforceProfileProvider,
  useWorkforceProfile,
} from "../shared/workforce";
export {
  fetchOwnCaptainReadiness as fetchCaptainOperationalReadiness,
} from "../shared/dispatch";
export {
  clearCaptainForegroundLocationOutbox,
} from "../shared/dispatch/dispatch-location.api";
export type {
  DshCaptainReadiness,
  DshCaptainReadiness as CaptainOperationalReadiness,
} from "../shared/dispatch";
