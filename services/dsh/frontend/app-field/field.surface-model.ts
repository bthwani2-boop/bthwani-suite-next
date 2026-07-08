// app-field — consolidated orchestration model & helpers for field surface.
// No JSX. No ui-kit.

import React from 'react';
import type {
  DshFieldRouteState,
  DshFieldNavigationCommand,
} from './dsh-field.routes';

function isSameRoute(left: DshFieldRouteState, right: DshFieldRouteState): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === 'visit' && right.kind === 'visit') {
    return left.storeId === right.storeId;
  }
  if (left.kind === 'checklist' && right.kind === 'checklist') {
    return left.visitId === right.visitId;
  }
  if (left.kind === 'onboarding' && right.kind === 'onboarding') {
    return left.partnerId === right.partnerId;
  }
  if (left.kind === 'partner-progress' && right.kind === 'partner-progress') {
    return left.partnerId === right.partnerId;
  }
  if (left.kind === 'escalation' && right.kind === 'escalation') {
    return left.storeId === right.storeId && left.visitId === right.visitId;
  }
  if (left.kind === 'products-upload' && right.kind === 'products-upload') {
    return left.partnerId === right.partnerId;
  }
  return true;
}

function resolveCommandRoute(command?: DshFieldNavigationCommand): DshFieldRouteState | null {
  if (!command) return null;
  if (command.target === 'visit' && command.storeId) {
    return { kind: 'visit', storeId: command.storeId };
  }
  if (command.target === 'checklist' && command.visitId && command.storeId) {
    return { kind: 'checklist', visitId: command.visitId, storeId: command.storeId };
  }
  if (command.target === 'onboarding') {
    return { kind: 'onboarding', ...(command.partnerId ? { partnerId: command.partnerId } : {}) };
  }
  if (command.target === 'escalation' && command.storeId) {
    return { kind: 'escalation', storeId: command.storeId, ...(command.visitId ? { visitId: command.visitId } : {}) };
  }
  if (command.target === 'work-queue') {
    return { kind: 'work-queue' };
  }
  if (command.target === 'products-upload' && command.partnerId) {
    return { kind: 'products-upload', partnerId: command.partnerId };
  }
  if (
    command.target === 'stores' ||
    command.target === 'account' ||
    command.target === 'profile' ||
    command.target === 'history' ||
    command.target === 'finance'
  ) {
    return { kind: command.target };
  }
  return { kind: 'stores' };
}

export function resolveFieldBottomActiveId(route: DshFieldRouteState): string {
  if (route.kind === 'stores') return 'tasks';
  if (['visit', 'checklist', 'escalation', 'work-queue'].includes(route.kind)) return 'tasks';
  if (route.kind === 'history') return 'history';
  if (route.kind === 'finance') return 'finance';
  if (['account', 'profile', 'onboarding', 'partner-progress', 'products-upload'].includes(route.kind)) {
    return 'profile';
  }
  return '';
}

export function canFieldShowBottomNav(route: DshFieldRouteState): boolean {
  return route.kind === 'stores' || route.kind === 'history' || route.kind === 'finance' || route.kind === 'account' || route.kind === 'work-queue';
}

export function useFieldNavigationModel({ command }: { command: DshFieldNavigationCommand | undefined }) {
  const [routeStack, setRouteStack] = React.useState<DshFieldRouteState[]>([{ kind: 'stores' }]);

  const route = routeStack[routeStack.length - 1] ?? { kind: 'stores' };

  React.useEffect(() => {
    if (typeof command?.token !== 'number') return;
    const nextRoute = resolveCommandRoute(command);
    if (nextRoute) {
      setRouteStack([nextRoute]);
    }
  }, [command]);

  const pushRoute = React.useCallback((nextRoute: DshFieldRouteState) => {
    setRouteStack((current) => {
      const activeRoute = current[current.length - 1];
      return activeRoute && isSameRoute(activeRoute, nextRoute) ? current : [...current, nextRoute];
    });
  }, []);

  const popRoute = React.useCallback(() => {
    setRouteStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
  }, []);

  const resetToStores = React.useCallback(() => setRouteStack([{ kind: 'stores' }]), []);

  return { route, routeStack, pushRoute, popRoute, resetToStores };
}

export function useDshFieldSurfaceModel(command?: DshFieldNavigationCommand) {
  const { route, routeStack, pushRoute, popRoute, resetToStores } = useFieldNavigationModel({ command });

  return {
    model: {
      route,
      routeStackDepth: routeStack.length,
      bottomNav: {
        activeId: resolveFieldBottomActiveId(route),
        visible: canFieldShowBottomNav(route),
      },
    },
    actions: {
      pushRoute,
      popRoute,
      resetToStores,
    },
  } as const;
}
