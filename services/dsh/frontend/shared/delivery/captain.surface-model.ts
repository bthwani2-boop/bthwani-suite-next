import React from 'react';
import type {
  DshCaptainRoute,
  CaptainSupportRoute,
} from './captain.contract';
import type {
  DshCaptainLocationPush,
  useCaptainOrderRuntime,
} from './use-captain-order-runtime';
import type {
  DshCaptainSurfaceState,
  DshCaptainSurfaceDerived,
} from './captain.surface.types';
import { buildCaptainDerived } from './captain.derived';

import type { useCaptainAvailabilityModel } from './captain-availability.model';
import type { useCaptainGpsModel } from './captain-gps.model';
import type { useCaptainProfileModel } from './captain-profile.model';
import type { useDeliveryLifecycle } from './delivery.lifecycle';
import type { useCaptainDeliveryActions } from './delivery.actions';
import type { usePodUploadFlow } from '../media/pod/pod-upload-flow';
import type { useCaptainOrderModel } from '../orders/captain-order.model';
import type { useCaptainChatModel } from '../chat';
import type { useCaptainServiceModeModel } from './captain-service-mode.model';
import type { useCaptainInboxModel } from './captain-inbox.model';

export type {
  DshCaptainSurfaceState,
  DshCaptainSurfaceDerived,
} from './captain.surface.types';

export type DshCaptainSurfaceSharedProps = {
  captainRuntimeId: string;
  route: DshCaptainRoute;
  activeAssignmentId: string;
  selectedSupportScreen: CaptainSupportRoute;
  availabilityModel: ReturnType<typeof useCaptainAvailabilityModel>;
  gpsModel: ReturnType<typeof useCaptainGpsModel>;
  profileModel: ReturnType<typeof useCaptainProfileModel>;
  lifecycle: ReturnType<typeof useDeliveryLifecycle>;
  podUpload: ReturnType<typeof usePodUploadFlow>;
  orderModel: ReturnType<typeof useCaptainOrderModel>;
  chatModel: ReturnType<typeof useCaptainChatModel>;
  serviceModeModel: ReturnType<typeof useCaptainServiceModeModel>;
  deliveryActions: ReturnType<typeof useCaptainDeliveryActions>;
  pushLocation: ReturnType<typeof useCaptainOrderRuntime>['pushLocation'];
  inboxModel: ReturnType<typeof useCaptainInboxModel>;
};

export function useDshCaptainSurfaceModel({
  route,
  activeAssignmentId,
  selectedSupportScreen,
  availabilityModel,
  gpsModel,
  profileModel,
  lifecycle,
  podUpload,
  orderModel,
  chatModel,
  serviceModeModel,
  deliveryActions,
  pushLocation,
  inboxModel,
}: DshCaptainSurfaceSharedProps) {
  const activeAssignment = inboxModel.findAssignment(activeAssignmentId);

  React.useEffect(() => {
    lifecycle.setInboxState(inboxModel.fetchState);
  }, [inboxModel.fetchState, lifecycle]);

  React.useEffect(() => {
    if (!activeAssignmentId) return;
    if (inboxModel.fetchState !== 'ready' && inboxModel.fetchState !== 'empty') return;
    if (activeAssignment) return;

    orderModel.clearActiveAssignment('ألغيت المهمة بسبب إلغاء الطلب أو إغلاقها من العمليات.');
    lifecycle.setIsDeclineSheetVisible(false);
    podUpload.resetPodFields();
  }, [activeAssignment, activeAssignmentId, inboxModel.fetchState, lifecycle, orderModel, podUpload]);

  const state: DshCaptainSurfaceState = {
    activeServiceType: profileModel.activeServiceType,
    route,
    inboxState: lifecycle.inboxState,
    activeAssignmentId,
    activeOrderId: activeAssignment?.orderId ?? '',
    activeDeliveryStatus: activeAssignment?.delivery.status ?? '',
    inboxItems: inboxModel.items,
    selectedSupportScreen,
    captainAvailabilityStatus: availabilityModel.captainAvailabilityStatus,
    gpsStatus: gpsModel.gpsStatus,
    activeOrderExpanded: orderModel.activeOrderExpanded,
    captainAppMode: profileModel.captainAppMode,
    activeOrderDraft: chatModel.activeOrderDraft,
    activeOrderMessages: chatModel.activeOrderMessages,
    captainPodState: podUpload.captainPodState,
    captainPodPhotoUri: podUpload.captainPodPhotoUri,
    isDeclineSheetVisible: lifecycle.isDeclineSheetVisible,
    declineSheetState: lifecycle.declineSheetState,
    declineOrderId: lifecycle.declineOrderId,
    deliveryActionState: lifecycle.deliveryActionState,
    deliveryActionMessage: lifecycle.deliveryActionMessage,
  };

  const derived: DshCaptainSurfaceDerived = React.useMemo(
    () => buildCaptainDerived(state, activeAssignment),
    [state, activeAssignment],
  );

  const actions = {
    setInboxState: lifecycle.setInboxState,
    resetInboxState: () => lifecycle.setInboxState('ready' as const),
    refreshInbox: inboxModel.refresh,
    toggleAvailability: availabilityModel.toggleAvailability,
    setActiveOrderExpanded: orderModel.setActiveOrderExpanded,
    setCaptainAvailabilityStatus: availabilityModel.setCaptainAvailabilityStatus,
    setGpsStatus: gpsModel.setGpsStatus,
    setDeliveryActionState: lifecycle.setDeliveryActionState,
    setDeliveryActionMessage: lifecycle.setDeliveryActionMessage,
    setIsDeclineSheetVisible: lifecycle.setIsDeclineSheetVisible,
    setDeclineOrderId: lifecycle.setDeclineOrderId,
    setCaptainPodPhotoUri: podUpload.setCaptainPodPhotoUri,
    setCaptainPodState: podUpload.setCaptainPodState,
    sendQuickMessage: chatModel.sendQuickMessage,
    setActiveOrderDraft: chatModel.setActiveOrderDraft,
    handleSelectServiceType: serviceModeModel.handleSelectServiceType,
    toggleStoreCourierMode: serviceModeModel.toggleStoreCourierMode,
    pushLocation,
    dismissAssignmentClosureNotice: () => orderModel.setAssignmentClosureNotice(null),
    ...deliveryActions,
  };

  return {
    state,
    actions,
    derived,
    activeAssignment,
    assignmentClosureNotice: orderModel.assignmentClosureNotice,
    operationalAssignmentId: inboxModel.operationalAssignment?.id ?? '',
    operationalAssignmentAmbiguous: inboxModel.operationalAssignmentAmbiguous,
  };
}
