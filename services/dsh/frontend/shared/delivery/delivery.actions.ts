// Canonical location: dsh/frontend/shared/delivery/delivery.actions.ts
// Authority: dsh/frontend/shared/delivery — delivery workflow operations and actions.
// Navigation is intentionally absent: callers decide Router transitions only after proven outcomes.

import React from 'react';
import type { CompactOrderChatMessage, CaptainAppMode } from './captain.contract';
import type { StoreCourierStage, ActiveOrderPhase } from './delivery.contract';
import { useCaptainOrderRuntime, type CaptainDeliveryExceptionDraft } from './use-captain-order-runtime';
import { DSH_CAPTAIN_CONTRACT_CAPABILITIES } from '../orders/dsh-order-lifecycle-client';
import { fetchCaptainDeliveryProof } from '../delivery-proof/delivery-proof.api';
import { classifyDispatchError } from '../dispatch/dispatch.api';

export type DeliveryActionsDeps = {
  captainRuntimeId: string;
  activeAssignmentId: string;
  captainPodPhotoUri: string | undefined;
  captainPodMediaKey: string | undefined;
  captainAppMode: CaptainAppMode;
  resetOrderState: () => void;
  refreshInbox: () => void | Promise<void>;
  inboxState: string;
  setInboxState: (s: any) => void;
  setStoreCourierStage: (s: any) => void;
  setIsDeclineSheetVisible: (v: boolean) => void;
  setDeclineSheetState: (s: any) => void;
  setIsPickupSheetVisible: (v: boolean) => void;
  setPickupSheetState: (s: any) => void;
  setDeliveryActionState: (s: any) => void;
  setDeliveryActionMessage: (s: string | null) => void;
  setActiveOrderPhase: (p: any) => void;
  setActiveOrderMessages: React.Dispatch<React.SetStateAction<CompactOrderChatMessage[]>>;
  setCaptainPodState: (s: any) => void;
  setActiveOrderExpanded: (v: boolean) => void;
};

export function useCaptainDeliveryActions(deps: DeliveryActionsDeps) {
  const {
    captainRuntimeId,
    activeAssignmentId,
    captainAppMode,
    resetOrderState,
    refreshInbox,
    setInboxState,
    setStoreCourierStage,
    setIsDeclineSheetVisible,
    setDeclineSheetState,
    setIsPickupSheetVisible,
    setPickupSheetState,
    setDeliveryActionState,
    setDeliveryActionMessage,
    setActiveOrderPhase,
    setActiveOrderMessages,
    setCaptainPodState,
    setActiveOrderExpanded,
  } = deps;

  const captainOrderRuntime = useCaptainOrderRuntime();

  const deliveryActionErrorMessage = React.useCallback((error: unknown): string => {
    const classified = classifyDispatchError(error);
    if (classified.kind === 'permission_denied') return 'لا تملك صلاحية تنفيذ هذه المرحلة.';
    if (classified.kind === 'offline') return 'لا يوجد اتصال. لم تتغير المرحلة محليًا؛ أعد المحاولة عند عودة الشبكة.';
    if (classified.kind === 'conflict') return classified.message ?? 'تغيرت المهمة أو سبق تنفيذ المرحلة. حدّث القراءة ثم أعد المحاولة.';
    return classified.message ?? 'تعذر تثبيت المرحلة. لم تتغير الحقيقة المحلية؛ أعد المحاولة.';
  }, []);

  const runDeliveryTransition = React.useCallback(async (
    transition: () => Promise<unknown>,
    successMessage: string,
  ): Promise<boolean> => {
    setDeliveryActionState('loading');
    setDeliveryActionMessage(null);
    try {
      await transition();
      await Promise.resolve(refreshInbox());
      setDeliveryActionState('success');
      setDeliveryActionMessage(successMessage);
      return true;
    } catch (error) {
      console.error('[captain:delivery-transition]', error);
      setDeliveryActionState('error');
      setDeliveryActionMessage(deliveryActionErrorMessage(error));
      return false;
    }
  }, [deliveryActionErrorMessage, refreshInbox, setDeliveryActionMessage, setDeliveryActionState]);

  const handleAcceptTask = React.useCallback(async (assignmentId: string): Promise<boolean> => {
    if (!captainRuntimeId || !assignmentId) {
      setInboxState('error');
      return false;
    }
    try {
      setInboxState('offer-accepting');
      await captainOrderRuntime.acceptTask(assignmentId, captainRuntimeId);
      resetOrderState();
      if (captainAppMode !== 'store_courier_mode') setStoreCourierStage('ready_for_pickup' as StoreCourierStage);
      await Promise.resolve(refreshInbox());
      setInboxState('offer-accepted');
      return true;
    } catch (err) {
      console.error('[captain:accept-assignment]', err);
      setInboxState('error');
      return false;
    }
  }, [captainOrderRuntime, captainRuntimeId, captainAppMode, resetOrderState, refreshInbox, setStoreCourierStage, setInboxState]);

  const handleDeclineConfirm = React.useCallback(async (assignmentId: string, reason: string): Promise<boolean> => {
    if (!captainRuntimeId || !assignmentId || !reason.trim()) {
      setDeclineSheetState('error');
      return false;
    }
    try {
      setDeclineSheetState('loading');
      await captainOrderRuntime.declineTask(assignmentId, captainRuntimeId, reason.trim());
      await Promise.resolve(refreshInbox());
      setDeclineSheetState('success');
      setIsDeclineSheetVisible(false);
      setDeclineSheetState('ready');
      return true;
    } catch (err) {
      console.error('[captain:decline-assignment]', err);
      setDeclineSheetState('error');
      return false;
    }
  }, [captainOrderRuntime, captainRuntimeId, refreshInbox, setDeclineSheetState, setIsDeclineSheetVisible]);

  const confirmStoreArrival = React.useCallback(async (): Promise<boolean> => {
    if (!captainRuntimeId || !activeAssignmentId) {
      setDeliveryActionState('error');
      setDeliveryActionMessage('لا توجد مهمة نشطة مرتبطة بالكابتن.');
      return false;
    }
    return runDeliveryTransition(
      () => captainOrderRuntime.confirmStoreArrival(activeAssignmentId, captainRuntimeId),
      'تم تثبيت الوصول للمتجر من DSH. راجع جاهزية العهدة قبل الاستلام.',
    );
  }, [activeAssignmentId, captainOrderRuntime, captainRuntimeId, runDeliveryTransition, setDeliveryActionMessage, setDeliveryActionState]);

  const confirmPickup = React.useCallback(async (): Promise<boolean> => {
    if (!captainRuntimeId || !activeAssignmentId) {
      setPickupSheetState('error');
      return false;
    }
    try {
      setPickupSheetState('loading');
      const transitioned = await runDeliveryTransition(
        () => captainOrderRuntime.confirmPickup(activeAssignmentId, captainRuntimeId),
        'تم تثبيت الاستلام. المرحلة التالية هي الوصول إلى العميل.',
      );
      if (!transitioned) {
        setPickupSheetState('error');
        return false;
      }
      setPickupSheetState('success');
      setIsPickupSheetVisible(false);
      setPickupSheetState('ready');
      setActiveOrderPhase('delivery' as ActiveOrderPhase);
      setActiveOrderMessages((cur: CompactOrderChatMessage[]) => [
        ...cur,
        { id: `msg-${cur.length + 1}`, sender: 'النظام', text: 'تم تأكيد الاستلام. المرحلة التالية هي التسليم.', time: 'الآن', side: 'start' },
      ]);
      return true;
    } catch (err) {
      console.error('[captain:confirm-pickup]', err);
      setPickupSheetState('error');
      return false;
    }
  }, [activeAssignmentId, captainOrderRuntime, captainRuntimeId, runDeliveryTransition, setPickupSheetState, setIsPickupSheetVisible, setActiveOrderPhase, setActiveOrderMessages]);

  const confirmCustomerArrival = React.useCallback(async (): Promise<boolean> => {
    if (!captainRuntimeId || !activeAssignmentId) {
      setDeliveryActionState('error');
      setDeliveryActionMessage('لا توجد مهمة نشطة مرتبطة بالكابتن.');
      return false;
    }
    return runDeliveryTransition(
      () => captainOrderRuntime.confirmCustomerArrival(activeAssignmentId, captainRuntimeId),
      'تم تثبيت الوصول للعميل من DSH. افتح إثبات التسليم لإكمال التسليم.',
    );
  }, [activeAssignmentId, captainOrderRuntime, captainRuntimeId, runDeliveryTransition, setDeliveryActionMessage, setDeliveryActionState]);

  const confirmPodSubmission = React.useCallback(async () => {
    if (!captainRuntimeId || !activeAssignmentId) {
      setCaptainPodState('error');
      return;
    }
    try {
      const proof = await fetchCaptainDeliveryProof(activeAssignmentId);
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
      console.error('[captain:pod-readback]', err);
      setCaptainPodState('error');
    }
  }, [activeAssignmentId, captainAppMode, captainRuntimeId, refreshInbox, setActiveOrderExpanded, setCaptainPodState, setInboxState, setStoreCourierStage]);

  const reportPodFailure = React.useCallback(async (draft: CaptainDeliveryExceptionDraft) => {
    if (!captainRuntimeId || !activeAssignmentId) {
      setCaptainPodState('error');
      return undefined;
    }
    if (!DSH_CAPTAIN_CONTRACT_CAPABILITIES.failDelivery) {
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
  }, [activeAssignmentId, captainOrderRuntime, captainRuntimeId, setCaptainPodState]);

  return { handleAcceptTask, handleDeclineConfirm, confirmStoreArrival, confirmPickup, confirmCustomerArrival, confirmPodSubmission, reportPodFailure };
}
