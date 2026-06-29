/**
 * DSH Captain App Public API
 *
 * This file defines the clean, intentional public API for the DSH captain surface.
 * Only components and types required by app-captain composition/shell are exported here.
 */

// Core Surface & Host
export { DshCaptainSurface } from './DshCaptainSurface';

// Public Types required by Composition/Shell
export type {
	DshCaptainCommandTarget,
	DshCaptainNavigationCommand,
	DshCaptainRoute,
	DshCaptainSurfaceProps,
	DshCaptainState,
	DshCaptainStateGroup,
	DshCaptainStateMeta,
	DshCaptainFinanceSnapshot,
	DshCaptainOperationsSnapshot,
	DshCaptainOrderActionPayload,
	DshCaptainOrderSnapshot,
	DshCaptainProfileSnapshot,
	DshCaptainProofPayload,
} from './dsh-captain.types';

// Routing & Registry
export { dshCaptainRoutes } from './dsh-captain.routes';
export type {
	DshCaptainLegacyRoute,
	DshCaptainRouteId,
	DshCaptainRouteRecord,
} from './dsh-captain.routes';

export { dshCaptainScreenRegistry } from './dsh-captain.screen-registry';
export type { DshCaptainScreenRegistryItem } from './dsh-captain.screen-registry';
