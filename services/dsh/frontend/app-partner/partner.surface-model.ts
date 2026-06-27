// app-partner — consolidated orchestration model & helpers for partner surface.
// No JSX. No ui-kit.

import React from 'react';
import type {
  DshPartnerRouteState,
  DshPartnerNavigationCommand,
} from './dsh-partner.routes';

function isSameRoute(left: DshPartnerRouteState, right: DshPartnerRouteState): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === 'settlement' && right.kind === 'settlement') {
    return left.orderId === right.orderId;
  }
  return true;
}

function resolveCommandRoute(command?: DshPartnerNavigationCommand): DshPartnerRouteState | null {
  if (!command) return null;
  if (command.target === 'settlement') {
    return {
      kind: 'settlement',
      ...(command.orderId ? { orderId: command.orderId } : {}),
    };
  }
  if (
    command.target === 'store' ||
    command.target === 'onboarding' ||
    command.target === 'catalog' ||
    command.target === 'orders' ||
    command.target === 'support' ||
    command.target === 'performance' ||
    command.target === 'documents' ||
    command.target === 'requirements'
  ) {
    return { kind: command.target };
  }
  return { kind: 'onboarding' };
}

export function resolvePartnerBottomActiveId(route: DshPartnerRouteState): string {
  if (route.kind === 'orders') return 'orders';
  if (route.kind === 'catalog') return 'catalog';
  if (route.kind === 'onboarding') return 'status';
  if (route.kind === 'support') return 'support';
  if (route.kind === 'store') return 'store';
  return '';
}

export function canPartnerShowBottomNav(route: DshPartnerRouteState): boolean {
  return ['store', 'onboarding', 'catalog', 'orders', 'support'].includes(route.kind);
}

export function usePartnerNavigationModel({ command }: { command: DshPartnerNavigationCommand | undefined }) {
  const [routeStack, setRouteStack] = React.useState<DshPartnerRouteState[]>([{ kind: 'onboarding' }]);

  const route = routeStack[routeStack.length - 1] ?? { kind: 'onboarding' };

  React.useEffect(() => {
    if (typeof command?.token !== 'number') return;
    const nextRoute = resolveCommandRoute(command);
    if (nextRoute) {
      setRouteStack([nextRoute]);
    }
  }, [command]);

  const pushRoute = React.useCallback((nextRoute: DshPartnerRouteState) => {
    setRouteStack((current) => {
      const activeRoute = current[current.length - 1];
      return activeRoute && isSameRoute(activeRoute, nextRoute) ? current : [...current, nextRoute];
    });
  }, []);

  const popRoute = React.useCallback(() => {
    setRouteStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
  }, []);

  const resetToStatus = React.useCallback(() => setRouteStack([{ kind: 'onboarding' }]), []);

  return { route, routeStack, pushRoute, popRoute, resetToStatus };
}

export function useDshPartnerSurfaceModel(command?: DshPartnerNavigationCommand) {
  const { route, routeStack, pushRoute, popRoute, resetToStatus } = usePartnerNavigationModel({ command });

  return {
    model: {
      route,
      routeStackDepth: routeStack.length,
      bottomNav: {
        activeId: resolvePartnerBottomActiveId(route),
        visible: canPartnerShowBottomNav(route),
      },
    },
    actions: {
      pushRoute,
      popRoute,
      resetToStatus,
    },
  } as const;
}
