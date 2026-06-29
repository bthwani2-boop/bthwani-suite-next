// Canonical location: dsh/frontend/shared/support/partner-support.model.ts
// Authority: dsh/frontend/shared/support — partner support navigation and command contexts.
// No JSX. No ui-kit. No Tamagui.

import React from 'react';
import type {
  DshPartnerRoute,
  DshPartnerSupportRouteId,
  DshPartnerSupportCommandContext,
  DshPartnerOperationalFlowId,
} from '../partner/partner.types';
import {
  buildSupportCommandContextFromOperationalFlow,
  buildSupportCommandContextFromSupportRoute,
  defaultSupportCommandContext,
} from './support.partner-context';
import { isCommandCenterInlineManagedRoute } from './support.partner-policies';

export type PartnerSupportModelProps = {
  initialRoute: DshPartnerRoute;
  setRoute: (route: DshPartnerRoute) => void;
};

export function usePartnerSupportModel({ initialRoute, setRoute }: PartnerSupportModelProps) {
  const [supportNav, setSupportNav] = React.useState<{
    screen: DshPartnerSupportRouteId;
    context: DshPartnerSupportCommandContext;
  }>({
    screen: initialRoute === 'order-rejection' ? 'order-reject' : 'order-issue-queue',
    context: initialRoute === 'order-rejection'
      ? buildSupportCommandContextFromSupportRoute('order-reject', 'orders')
      : { ...defaultSupportCommandContext },
  });

  const selectedSupportScreen = supportNav.screen;
  const supportCommandContext = supportNav.context;
  const supportDirectoryIntentRef = React.useRef(false);

  const setSelectedSupportScreen = React.useCallback(
    (screen: DshPartnerSupportRouteId) => setSupportNav((s) => ({ ...s, screen })),
    [],
  );

  const setSupportCommandContext = React.useCallback(
    (context: DshPartnerSupportCommandContext) => setSupportNav((s) => ({ ...s, context })),
    [],
  );

  const isCommandCenterInline = React.useMemo(
    () => isCommandCenterInlineManagedRoute(selectedSupportScreen),
    [selectedSupportScreen],
  );

  const markSupportDirectoryIntent = React.useCallback(() => {
    supportDirectoryIntentRef.current = true;
    Promise.resolve().then(() => {
      supportDirectoryIntentRef.current = false;
    });
  }, []);

  const openSupportDirectory = React.useCallback(
    (context?: Partial<DshPartnerSupportCommandContext>) => {
      markSupportDirectoryIntent();
      setSupportCommandContext({
        ...defaultSupportCommandContext,
        ...context,
      } as DshPartnerSupportCommandContext);
      setRoute('support-directory');
    },
    [markSupportDirectoryIntent, setSupportCommandContext, setRoute],
  );

  const returnToSupportDirectory = React.useCallback(() => setRoute('support-directory'), [setRoute]);

  const openSupportScreen = React.useCallback(
    (screenId: DshPartnerSupportRouteId, source: DshPartnerSupportCommandContext['source'] = 'operations') => {
      const nextContext = buildSupportCommandContextFromSupportRoute(screenId, source);
      const shouldStay = supportDirectoryIntentRef.current && isCommandCenterInlineManagedRoute(screenId);
      supportDirectoryIntentRef.current = false;
      setSupportCommandContext(nextContext);
      if (shouldStay) {
        setRoute('support-directory');
        return;
      }
      setSelectedSupportScreen(screenId);
      setRoute('support-screen');
    },
    [setSupportCommandContext, setSelectedSupportScreen, setRoute],
  );

  const handleOperationalFlowNavigation = React.useCallback(
    (flowId: DshPartnerOperationalFlowId, source?: DshPartnerSupportCommandContext['source']) => {
      const ctx = buildSupportCommandContextFromOperationalFlow(flowId, source);
      setSupportCommandContext(ctx);
      setRoute('support-directory');
    },
    [setSupportCommandContext, setRoute],
  );

  return {
    supportNav,
    setSupportNav,
    selectedSupportScreen,
    supportCommandContext,
    setSelectedSupportScreen,
    setSupportCommandContext,
    isCommandCenterInline,
    openSupportDirectory,
    returnToSupportDirectory,
    openSupportScreen,
    handleOperationalFlowNavigation,
  };
}
