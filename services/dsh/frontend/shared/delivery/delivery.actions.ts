// Canonical location: dsh/frontend/shared/delivery/delivery.actions.ts
// Authority: dsh/frontend/shared/delivery — delivery workflow operations and actions.
// No JSX. No ui-kit. No Tamagui.

import React from 'react';
import type { CompactOrderChatMessage, CaptainAppMode } from './captain.contract';
import type { StoreCourierStage, ActiveOrderPhase } from './delivery.contract';
import { resolveDshRuntimeOrderId, useCaptainOrderRuntime } from './use-captain-order-runtime';
import { DSH_CAPTAIN_CONTRACT_CAPABILITIES } from '../orders/dsh-order-lifecycle-client';

export type DeliveryActionsDeps = {
  captainRuntimeId: string;
  activeAssignmentId: string;
  setActiveAssignmentId: (id: string) => void;
  captainPodPhotoUri: string | undefined;
  captainPodMediaKey: string | undefined;
  captainAppMode: CaptainAppMode;
  setRoute: (r: any) => void;
  resetOrderState: () => void;
  refreshInbox: () => void;

  // Lifecycle setters/states
  inboxState: string;
  setInboxState: (s: any) => void;
  setStoreCourierStage: (s: any) => void;
  setIsDeclineSheetVisible: (v: boolean) => void;
  setDeclineSheetState: (s: any) => void;
  setIsPickupSheetVisible: (v: boolean) => void;
  setPickupSheetState: (s: any) => void;
  setActiveOrderPhase: (p: any) => void;
  setActiveOrderMessages: React.Dispatch<React.SetStateAction<CompactOrderChatMessage[]>>;
  setCaptainPodState: (s: any) => void;
  setActiveOrderExpanded: (v: boolean) => void;
};

export function useCaptainDeliveryActions(deps: DeliveryActionsDeps) {
  const {
    captainRuntimeId,
    activeAssignmentId,
    setActiveAssignmentId,
    captainPodPhotoUri,
    captainPodMediaKey,
    captainAppMode,
    setRoute,
    resetOrderState,
    refreshInbox,
    setInboxState,
    setStoreCourierStage,
    setIsDeclineSheetVisible,
    setDeclineSheetState,
    setIsPickupSheetVisible,
    setPickupSheetState,
    setActiveOrderPhase,
    setActiveOrderMessages,
    setCaptainPodState,
    setActiveOrderExpanded,
  } = deps;

  const captainOrderRuntime = useCaptainOrderRuntime();

  const handleAcceptTask = React.useCallback(async (assignmentId: string) => {
    if (!captainRuntimeId) return void setInboxState('error');
    try {
      setInboxState('offer-accepting');
      await captainOrderRuntime.acceptTask(resolveDshRuntimeOrderId(assignmentId), captainRuntimeId);
      setInboxState('offer-accepted');
      setActiveAssignmentId(assignmentId);
      resetOrderState();
      if (captainAppMode !== 'store_courier_mode') setStoreCourierStage('ready_for_pickup' as StoreCourierStage);
      setRoute('detail');
      setInboxState('ready');
      refreshInbox();
    } catch (err) {
      console.error('[captain:accept-task]', err);
      setInboxState('error');
    }
  }, [captainOrderRuntime, captainRuntimeId, captainAppMode, setActiveAssignmentId, resetOrderState, refreshInbox, setStoreCourierStage, setRoute, setInboxState]);

  const handleDeclineConfirm = React.useCallback(async (assignmentId: string, reason: string) => {
    if (!captainRuntimeId) return void setDeclineSheetState('error');
    try {
      setDeclineSheetState('loading');
      await captainOrderRuntime.declineTask(resolveDshRuntimeOrderId(assignmentId), captainRuntimeId, reason);
      setDeclineSheetState('success');
      refreshInbox();
      setTimeout(() => {
        setIsDeclineSheetVisible(false);
        setDeclineSheetState('ready');
        setRoute('inbox');
      }, 1000);
    } catch (err) {
      console.error('[captain:decline-task]', err);
      setDeclineSheetState('error');
    }
  }, [captainOrderRuntime, captainRuntimeId, refreshInbox, setDeclineSheetState, setIsDeclineSheetVisible, setRoute]);

  const confirmPickup = React.useCallback(async () => {
    if (!captainRuntimeId) return void setPickupSheetState('error');
    try {
      setPickupSheetState('loading');
      await captainOrderRuntime.confirmPickup(resolveDshRuntimeOrderId(activeAssignmentId), captainRuntimeId);
      setPickupSheetState('success');
      refreshInbox();
      setTimeout(() => {
        setIsPickupSheetVisible(false);
        setPickupSheetState('ready');
        setActiveOrderPhase('delivery' as ActiveOrderPhase);
        setActiveOrderMessages((cur: CompactOrderChatMessage[]) => [
          ...cur,
          { id: `msg-${cur.length + 1}`, sender: 'النظام', text: 'تم تأكيد الاستلام. المرحلة التالية هي التسليم.', time: 'الآن', side: 'start' },
        ]);
      }, 1000);
    } catch (err) {
      console.error('[captain:confirm-pickup]', err);
      setPickupSheetState('error');
    }
  }, [activeAssignmentId, captainOrderRuntime, captainRuntimeId, refreshInbox, setPickupSheetState, setIsPickupSheetVisible, setActiveOrderPhase, setActiveOrderMessages]);

  const confirmDelivery = React.useCallback(async () => {
    if (!captainRuntimeId) return void setCaptainPodState('error');
    try {
      await captainOrderRuntime.deliverOrder(resolveDshRuntimeOrderId(activeAssignmentId), captainRuntimeId);
      setInboxState('delivered');
      setActiveOrderExpanded(false);
      refreshInbox();
    } catch (err) {
      console.error('[captain:confirm-delivery]', err);
      setCaptainPodState('error');
    }
  }, [activeAssignmentId, captainOrderRuntime, captainRuntimeId, refreshInbox, setCaptainPodState, setInboxState, setActiveOrderExpanded]);

  const confirmPodSubmission = React.useCallback(async () => {
    if (!captainRuntimeId || !captainPodPhotoUri || !captainPodMediaKey) return;
    setCaptainPodState('loading');
    try {
      await captainOrderRuntime.deliverOrder(resolveDshRuntimeOrderId(activeAssignmentId), captainRuntimeId, captainPodMediaKey);
      setCaptainPodState('success');
      if (captainAppMode === 'store_courier_mode') {
        setStoreCourierStage('delivered' as StoreCourierStage);
        setInboxState('delivered');
      }
      refreshInbox();
    } catch (err) {
      console.error('[captain:pod-submit]', err);
      setCaptainPodState('error');
    }
  }, [activeAssignmentId, captainAppMode, captainOrderRuntime, captainRuntimeId, captainPodMediaKey, captainPodPhotoUri, refreshInbox, setCaptainPodState, setStoreCourierStage, setInboxState]);

  const reportPodFailure = React.useCallback(async () => {
    if (!captainRuntimeId) return void setCaptainPodState('error');
    if (!DSH_CAPTAIN_CONTRACT_CAPABILITIES.failDelivery) {
      // The DSH backend contract does not expose a failed-delivery mutation
      // yet; the action is disabled explicitly instead of failing opaquely.
      console.warn('[captain:pod-fail] delivery-failure reporting is not exposed by the DSH backend contract — action disabled');
      setCaptainPodState('error');
      return;
    }
    try {
      await captainOrderRuntime.failDelivery(resolveDshRuntimeOrderId(activeAssignmentId), captainRuntimeId);
      setCaptainPodState('retry-required');
      if (captainAppMode === 'store_courier_mode') setStoreCourierStage('delivery_failed' as StoreCourierStage);
    } catch (err) {
      console.error('[captain:pod-fail]', err);
      setCaptainPodState('error');
    }
  }, [activeAssignmentId, captainOrderRuntime, captainRuntimeId, captainAppMode, setCaptainPodState, setStoreCourierStage]);

  return { handleAcceptTask, handleDeclineConfirm, confirmPickup, confirmDelivery, confirmPodSubmission, reportPodFailure };
}
