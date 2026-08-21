// app-field — presentation model for the field surface.
// Navigation truth is owned by Expo Router; this module derives only visual state.

import type { DshFieldRouteState } from './dsh-field.routes';

export function resolveFieldBottomActiveId(route: DshFieldRouteState): string {
  if (route.kind === 'stores') return 'stores';
  if (['visit', 'checklist', 'verification', 'escalation', 'work-queue'].includes(route.kind)) return 'stores';
  if (route.kind === 'finance') return 'finance';
  if (['account', 'profile', 'profile-completion', 'onboarding', 'partner-progress', 'products-upload'].includes(route.kind)) {
    return 'profile';
  }
  return '';
}

export function canFieldShowBottomNav(route: DshFieldRouteState): boolean {
  return route.kind === 'stores' || route.kind === 'finance' || route.kind === 'account' || route.kind === 'work-queue';
}

export function useDshFieldSurfaceModel(route: DshFieldRouteState) {
  return {
    model: {
      route,
      bottomNav: {
        activeId: resolveFieldBottomActiveId(route),
        visible: canFieldShowBottomNav(route),
      },
    },
  } as const;
}
