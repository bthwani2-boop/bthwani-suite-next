// Canonical location: dsh/frontend/shared/delivery/captain/captain-navigation.model.ts
// Authority: dsh/frontend/shared/delivery/captain — captain navigation model.
// No JSX. No ui-kit. No Tamagui.

import React from 'react';
import type { DshCaptainRoute, CaptainSupportRoute, DshCaptainCommandTarget } from './captain.contract';
import { getRouteForCommandTarget } from './delivery.policy';

type CaptainNavigationDeps = {
  command: { target: DshCaptainCommandTarget; token?: number };
  route: DshCaptainRoute;
  setRoute: React.Dispatch<React.SetStateAction<DshCaptainRoute>>;
  setActiveAssignmentId: React.Dispatch<React.SetStateAction<string>>;
  setSelectedSupportScreen: React.Dispatch<React.SetStateAction<CaptainSupportRoute>>;
};

export function useCaptainNavigationModel({
  command,
  route,
  setRoute,
  setActiveAssignmentId,
  setSelectedSupportScreen,
}: CaptainNavigationDeps) {
  const routeHistoryRef = React.useRef<DshCaptainRoute[]>(['home']);
  const routeTransitionFromBackRef = React.useRef(false);
  const commandKeyRef = React.useRef(`${command.target}:${command.token ?? ''}`);

  React.useEffect(() => {
    const commandKey = `${command.target}:${command.token ?? ''}`;
    if (commandKey !== commandKeyRef.current) {
      commandKeyRef.current = commandKey;
      const nextRoute = getRouteForCommandTarget(command.target);
      if (command.target === 'orderchat') {
        setSelectedSupportScreen('chat-send');
      }
      routeHistoryRef.current = [nextRoute];
      routeTransitionFromBackRef.current = false;
      setRoute(nextRoute);
      return;
    }
    const previousRoute = routeHistoryRef.current[routeHistoryRef.current.length - 1];
    if (route !== previousRoute) {
      if (routeTransitionFromBackRef.current) {
        routeTransitionFromBackRef.current = false;
      } else {
        routeHistoryRef.current.push(route);
      }
    }
  }, [command.target, command.token, route, setRoute, setSelectedSupportScreen]);

  const goBack = React.useCallback(() => {
    if (routeHistoryRef.current.length > 1) {
      routeTransitionFromBackRef.current = true;
      routeHistoryRef.current.pop();
      const prev = routeHistoryRef.current[routeHistoryRef.current.length - 1] ?? 'home';
      setRoute(prev);
      return true;
    }
    if (route !== 'home') { setRoute('home'); return true; }
    return false;
  }, [route, setRoute]);

  const goToInbox = React.useCallback(() => setRoute('inbox'), [setRoute]);
  const openOrderDetail = React.useCallback((assignmentId: string) => { setActiveAssignmentId(assignmentId); setRoute('detail'); }, [setActiveAssignmentId, setRoute]);
  const openCaptainAccount = React.useCallback(() => setRoute('account'), [setRoute]);
  const openCaptainAccountSection = React.useCallback((r: DshCaptainRoute) => setRoute(r), [setRoute]);
  const openSupportDirectory = React.useCallback(() => setRoute('support-directory'), [setRoute]);
  const openCaptainSupportScreen = React.useCallback((screenId: CaptainSupportRoute) => {
    setSelectedSupportScreen(screenId);
    setRoute('support-screen');
  }, [setSelectedSupportScreen, setRoute]);

  return {
    goBack,
    goToInbox,
    openOrderDetail,
    openCaptainAccount,
    openCaptainAccountSection,
    openSupportDirectory,
    openCaptainSupportScreen,
  };
}
