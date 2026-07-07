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
	DshCaptainProfileSnapshot,
} from './dsh-captain.types';

// Routing & Registry
export type {
	DshCaptainLegacyRoute,
	DshCaptainRouteId,
	DshCaptainRouteRecord,
} from './dsh-captain.routes';

export type { DshCaptainScreenRegistryItem } from './dsh-captain.screen-registry';
