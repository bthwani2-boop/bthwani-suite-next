import {
  useDshCaptainSurfaceBinding,
} from '../shared/delivery/captain-surface.binding';
import type {
  DshCaptainNavigationCommand,
} from '../shared/delivery/captain.surface.types';

export type {
  ActiveOrderPhase,
  StoreCourierStage,
  DshCaptainNavigationCommand,
  DshCaptainSurfaceState,
  DshCaptainSurfaceDerived,
} from '../shared/delivery/captain.surface.types';

export function useDshCaptainSurfaceModel(
  command: DshCaptainNavigationCommand | undefined,
  captainRuntimeId: string,
) {
  return useDshCaptainSurfaceBinding(command, captainRuntimeId);
}
