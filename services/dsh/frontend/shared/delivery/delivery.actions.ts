// Canonical location: dsh/frontend/shared/delivery/delivery.actions.ts
// Authority: dsh/frontend/shared/delivery — delivery workflow operations and actions.
// No JSX. No ui-kit. No Tamagui.

import React from 'react';
import type { CompactOrderChatMessage, CaptainAppMode } from './captain.contract';
import type { StoreCourierStage, ActiveOrderPhase } from './delivery.contract';
import { resolveDshRuntimeOrderId, useCaptainOrderRuntime } from './use-captain-order-runtime';

export type DeliveryActionsDeps = {
  captainRuntimeId: string;
  activeOrderId: string;
  setActiveOrderId: (id: string) => void;
  captainPodPhotoUri: string | undefined;
  captainPodMediaKey: string | undefined;
  captainAppMode: CaptainAppMode;
  setRoute: (r: any) => void;
  resetOrderState: () => void;

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
    activeOrderId,
    setActiveOrderId,
    captainPodPhotoUri,
    captainPodMediaKey,
    captainAppMode,
    setRoute,
    resetOrderState,
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

  const handleAcceptTask = React.useCallback(async (orderId: string) => {
    if (!captainRuntimeId) return void setInboxState('error');
    try {
      setInboxState('offer-accepting');
      await captainOrderRuntime.acceptTask(resolveDshRuntimeOrderId(orderId), captainRuntimeId);
      setInboxState('offer-accepted');
      setActiveOrderId(orderId);
      resetOrderState();
      if (captainAppMode !== 'store_courier_mode') setStoreCourierStage('ready_for_pickup' as StoreCourierStage);
      setRoute('detail');
      setInboxState('ready');
    } catch (err) {
      console.error('[captain:accept-task]', err);
      setInboxState('error');
    }
  }, [captainOrderRuntime, captainRuntimeId, captainAppMode, setActiveOrderId, resetOrderState, setStoreCourierStage, setRoute, setInboxState]);

  const handleDeclineConfirm = React.useCallback(async (orderId: string, reason: string) => {
    if (!captainRuntimeId) return void setDeclineSheetState('error');
    try {
      setDeclineSheetState('loading');
      await captainOrderRuntime.declineTask(resolveDshRuntimeOrderId(orderId), captainRuntimeId, reason);
      setDeclineSheetState('success');
      setTimeout(() => {
        setIsDeclineSheetVisible(false);
        setDeclineSheetState('ready');
        setRoute('inbox');
      }, 1000);
    } catch (err) {
      console.error('[captain:decline-task]', err);
      setDeclineSheetState('error');
    }
  }, [captainOrderRuntime, captainRuntimeId, setDeclineSheetState, setIsDeclineSheetVisible, setRoute]);

  const confirmPickup = React.useCallback(async () => {
    if (!captainRuntimeId) return void setPickupSheetState('error');
    try {
      setPickupSheetState('loading');
      await captainOrderRuntime.confirmPickup(resolveDshRuntimeOrderId(activeOrderId), captainRuntimeId);
      setPickupSheetState('success');
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
  }, [activeOrderId, captainOrderRuntime, captainRuntimeId, setPickupSheetState, setIsPickupSheetVisible, setActiveOrderPhase, setActiveOrderMessages]);

  const confirmDelivery = React.useCallback(async () => {
    if (!captainRuntimeId) return void setCaptainPodState('error');
    try {
      await captainOrderRuntime.deliverOrder(resolveDshRuntimeOrderId(activeOrderId), captainRuntimeId);
      setInboxState('delivered');
      setActiveOrderExpanded(false);
    } catch (err) {
      console.error('[captain:confirm-delivery]', err);
      setCaptainPodState('error');
    }
  }, [activeOrderId, captainOrderRuntime, captainRuntimeId, setCaptainPodState, setInboxState, setActiveOrderExpanded]);

  const confirmPodSubmission = React.useCallback(async () => {
    if (!captainRuntimeId || !captainPodPhotoUri || !captainPodMediaKey) return;
    setCaptainPodState('loading');
    try {
      await captainOrderRuntime.deliverOrder(resolveDshRuntimeOrderId(activeOrderId), captainRuntimeId, captainPodMediaKey);
      setCaptainPodState('success');
      if (captainAppMode === 'store_courier_mode') {
        setStoreCourierStage('delivered' as StoreCourierStage);
        setInboxState('delivered');
      }
    } catch (err) {
      console.error('[captain:pod-submit]', err);
      setCaptainPodState('error');
    }
  }, [activeOrderId, captainAppMode, captainOrderRuntime, captainRuntimeId, captainPodMediaKey, captainPodPhotoUri, setCaptainPodState, setStoreCourierStage, setInboxState]);

  const reportPodFailure = React.useCallback(async () => {
    if (!captainRuntimeId) return void setCaptainPodState('error');
    try {
      await captainOrderRuntime.failDelivery(resolveDshRuntimeOrderId(activeOrderId), captainRuntimeId);
      setCaptainPodState('retry-required');
      if (captainAppMode === 'store_courier_mode') setStoreCourierStage('delivery_failed' as StoreCourierStage);
    } catch (err) {
      console.error('[captain:pod-fail]', err);
      setCaptainPodState('error');
    }
  }, [activeOrderId, captainOrderRuntime, captainRuntimeId, captainAppMode, setCaptainPodState, setStoreCourierStage]);

  return { handleAcceptTask, handleDeclineConfirm, confirmPickup, confirmDelivery, confirmPodSubmission, reportPodFailure };
}
