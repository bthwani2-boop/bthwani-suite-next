import {
  useDshCaptainSurfaceBinding,
} from '../shared/delivery/captain-surface.binding';
import type { CaptainSupportRoute, DshCaptainRoute } from '../shared/delivery';

export type {
  ActiveOrderPhase,
  StoreCourierStage,
  DshCaptainSurfaceState,
  DshCaptainSurfaceDerived,
} from '../shared/delivery/captain.surface.types';

export function useDshCaptainSurfaceModel(
  captainRuntimeId: string,
  route: DshCaptainRoute,
  routeAssignmentId: string,
  selectedSupportScreen: CaptainSupportRoute,
) {
  return useDshCaptainSurfaceBinding(captainRuntimeId, route, routeAssignmentId, selectedSupportScreen);
}
