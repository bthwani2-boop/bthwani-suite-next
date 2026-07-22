// Canonical location: dsh/frontend/shared/delivery/delivery.actions.ts
// Authority: dsh/frontend/shared/delivery — delivery workflow operations and actions.
// No JSX. No ui-kit. No Tamagui.

import React from 'react';
import type { CompactOrderChatMessage, CaptainAppMode } from './captain.contract';
import type { StoreCourierStage, ActiveOrderPhase } from './delivery.contract';
import { useCaptainOrderRuntime, type CaptainDeliveryExceptionDraft } from './use-captain-order-runtime';
import { DSH_CAPTAIN_CONTRACT_CAPABILITIES } from '../orders/dsh-order-lifecycle-client';
import { uploadAndSubmitCaptainDeliveryProof } from '../media/pod/delivery-proof-media.api';

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
    if (!captainRuntimeId || !assignmentId) return void setInboxState('error');
    try {
      setInboxState('offer-accepting');
      await captainOrderRuntime.acceptTask(assignmentId, captainRuntimeId);
      setActiveAssignmentId(assignmentId);
      resetOrderState();
      if (captainAppMode !== 'store_courier_mode') setStoreCourierStage('ready_for_pickup' as StoreCourierStage);
      await Promise.resolve(refreshInbox());
      setInboxState('offer-accepted');
      setRoute('detail');
    } catch (err) {
      console.error('[captain:accept-assignment]', err);
      setInboxState('error');
    }
  }, [captainOrderRuntime, captainRuntimeId, captainAppMode, setActiveAssignmentId, resetOrderState, refreshInbox, setStoreCourierStage, setRoute, setInboxState]);

  const handleDeclineConfirm = React.useCallback(async (assignmentId: string, reason: string) => {
    if (!captainRuntimeId || !assignmentId || !reason.trim()) return void setDeclineSheetState('error');
    try {
      setDeclineSheetState('loading');
      await captainOrderRuntime.declineTask(assignmentId, captainRuntimeId, reason.trim());
      await Promise.resolve(refreshInbox());
      setDeclineSheetState('success');
      setIsDeclineSheetVisible(false);
      setDeclineSheetState('ready');
      setRoute('inbox');
    } catch (err) {
      console.error('[captain:decline-assignment]', err);
      setDeclineSheetState('error');
    }
  }, [captainOrderRuntime, captainRuntimeId, refreshInbox, setDeclineSheetState, setIsDeclineSheetVisible, setRoute]);

  const confirmPickup = React.useCallback(async () => {
    if (!captainRuntimeId || !activeAssignmentId) return void setPickupSheetState('error');
    try {
      setPickupSheetState('loading');
      await captainOrderRuntime.confirmPickup(activeAssignmentId, captainRuntimeId);
      await Promise.resolve(refreshInbox());
      setPickupSheetState('success');
      setIsPickupSheetVisible(false);
      setPickupSheetState('ready');
      setActiveOrderPhase('delivery' as ActiveOrderPhase);
      setActiveOrderMessages((cur: CompactOrderChatMessage[]) => [
        ...cur,
        { id: `msg-${cur.length + 1}`, sender: 'النظام', text: 'تم تأكيد الاستلام. المرحلة التالية هي التسليم.', time: 'الآن', side: 'start' },
      ]);
    } catch (err) {
      console.error('[captain:confirm-pickup]', err);
      setPickupSheetState('error');
    }
  }, [activeAssignmentId, captainOrderRuntime, captainRuntimeId, refreshInbox, setPickupSheetState, setIsPickupSheetVisible, setActiveOrderPhase, setActiveOrderMessages]);

  const confirmDelivery = React.useCallback(async () => {
    if (!captainRuntimeId || !activeAssignmentId) return void setCaptainPodState('error');
    setCaptainPodState('ready');
    setRoute('pod-submission');
  }, [activeAssignmentId, captainRuntimeId, setCaptainPodState, setRoute]);

  const confirmPodSubmission = React.useCallback(async (pin = '') => {
    const normalizedPin = pin.trim();
    if (!captainRuntimeId || !activeAssignmentId || (!captainPodPhotoUri && !/^\d{6}$/.test(normalizedPin))) {
      setCaptainPodState('error');
      return;
    }
    setCaptainPodState('loading');
    try {
      const proof = await uploadAndSubmitCaptainDeliveryProof(
        activeAssignmentId,
        captainPodPhotoUri ? { uri: captainPodPhotoUri } : undefined,
        { pin: normalizedPin, capturedAt: new Date().toISOString() },
      );
      await Promise.resolve(refreshInbox());
      if (proof.status === 'pending_review' || proof.status === 'submitted') {
        setCaptainPodState('pending_review');
        return;
      }
      if (proof.status === 'rejected') {
        setCaptainPodState('rejected');
        return;
      }
      if (proof.status !== 'accepted') {
        setCaptainPodState('error');
        return;
      }
      setCaptainPodState('success');
      setInboxState('delivered');
      setActiveOrderExpanded(false);
      if (captainAppMode === 'store_courier_mode') {
        setStoreCourierStage('delivered' as StoreCourierStage);
      }
    } catch (err) {
      console.error('[captain:pod-submit]', err);
      setCaptainPodState('error');
    }
  }, [activeAssignmentId, captainAppMode, captainPodPhotoUri, captainRuntimeId, refreshInbox, setActiveOrderExpanded, setCaptainPodState, setInboxState, setStoreCourierStage]);

  const reportPodFailure = React.useCallback(async (draft: CaptainDeliveryExceptionDraft) => {
    if (!captainRuntimeId || !activeAssignmentId) {
      setCaptainPodState('error');
      return undefined;
    }
    if (!DSH_CAPTAIN_CONTRACT_CAPABILITIES.failDelivery || captainAppMode === 'store_courier_mode') {
      setCaptainPodState('error');
      return undefined;
    }
    setCaptainPodState('loading');
    try {
      const exception = await captainOrderRuntime.failDelivery(activeAssignmentId, captainRuntimeId, draft);
      setCaptainPodState('ready');
      return exception;
    } catch (err) {
      console.error('[captain:delivery-exception]', err);
      setCaptainPodState('error');
      return undefined;
    }
  }, [activeAssignmentId, captainOrderRuntime, captainRuntimeId, captainAppMode, setCaptainPodState]);

  return { handleAcceptTask, handleDeclineConfirm, confirmPickup, confirmDelivery, confirmPodSubmission, reportPodFailure };
}
