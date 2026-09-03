/**
 * DSH Captain App Public API.
 *
 * The runtime composes the canonical DshCaptainApplication boundary and may
 * consume route/platform contracts. Product surfaces, gates, readiness
 * decisions and profile providers remain internal to DSH.
 */

export { DshCaptainApplication } from "./DshCaptainApplication";
export type { DshCaptainApplicationProps } from "./DshCaptainApplication";

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

export {
  clearCaptainForegroundLocationOutbox,
} from "../shared/dispatch/dispatch-location.api";
