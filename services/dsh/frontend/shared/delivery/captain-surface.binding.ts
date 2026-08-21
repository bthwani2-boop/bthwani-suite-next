import React from 'react';
import { useDeliveryLifecycle } from './delivery.lifecycle';
import { useCaptainDeliveryActions } from './delivery.actions';
import { usePodUploadFlow } from '../media/pod/pod-upload-flow';
import { useCaptainOrderModel } from '../orders/captain-order.model';
import { useCaptainChatModel } from '../chat';
import { useCaptainAvailabilityModel } from './captain-availability.model';
import { useCaptainGpsModel } from './captain-gps.model';
import { useCaptainProfileModel } from './captain-profile.model';
import { useCaptainServiceModeModel } from './captain-service-mode.model';
import { useCaptainInboxModel } from './captain-inbox.model';
import type { CaptainSupportRoute, DshCaptainRoute } from './captain.contract';
import {
  useCaptainActiveLocationPush,
  useCaptainOrderRuntime,
  type DshCaptainLocationPush,
} from './use-captain-order-runtime';
import { useDshCaptainSurfaceModel as useDshCaptainSurfacePresenterModel } from './captain.surface-model';

export function useDshCaptainSurfaceBinding(
  captainRuntimeId: string,
  route: DshCaptainRoute,
  routeAssignmentId: string,
  selectedSupportScreen: CaptainSupportRoute,
) {
  const availabilityModel = useCaptainAvailabilityModel();
  const gpsModel = useCaptainGpsModel();
  const profileModel = useCaptainProfileModel();
  const lifecycle = useDeliveryLifecycle();
  const podUpload = usePodUploadFlow();
  const orderModel = useCaptainOrderModel();
  const chatModel = useCaptainChatModel();
  const inboxModel = useCaptainInboxModel(captainRuntimeId);

  const contextAssignmentId = routeAssignmentId || inboxModel.operationalAssignment?.id || '';
  const operationalAssignmentId = inboxModel.operationalAssignment?.id || '';
  const operationalAssignment = operationalAssignmentId
    ? inboxModel.findAssignment(operationalAssignmentId)
    : undefined;

  const captainOrderRuntime = useCaptainOrderRuntime();
  useCaptainActiveLocationPush({
    activeAssignmentId: operationalAssignmentId,
    captainId: captainRuntimeId,
    lifecycleStatus: operationalAssignment?.delivery.status,
  });

  const serviceModeModel = useCaptainServiceModeModel({
    setActiveServiceType: profileModel.setActiveServiceType,
    setInboxState: lifecycle.setInboxState,
    setActiveOrderExpanded: orderModel.setActiveOrderExpanded,
    setIsPickupSheetVisible: lifecycle.setIsPickupSheetVisible,
    setIsDeliverySheetVisible: lifecycle.setIsDeliverySheetVisible,
    setCaptainAppMode: profileModel.setCaptainAppMode,
  });

  const resetOrderState = React.useCallback(() => {
    orderModel.setActiveOrderExpanded(false);
    lifecycle.setActiveOrderPhase('pickup');
    chatModel.setActiveOrderDraft('');
    chatModel.setActiveOrderMessages([]);
    podUpload.resetPodFields();
  }, [orderModel, lifecycle, chatModel, podUpload]);

  const deliveryActions = useCaptainDeliveryActions({
    captainRuntimeId,
    activeAssignmentId: contextAssignmentId,
    captainPodPhotoUri: podUpload.captainPodPhotoUri,
    captainPodMediaKey: podUpload.captainPodMediaKey,
    captainAppMode: profileModel.captainAppMode,
    resetOrderState,
    refreshInbox: inboxModel.refresh,
    inboxState: lifecycle.inboxState,
    setInboxState: lifecycle.setInboxState,
    setStoreCourierStage: lifecycle.setStoreCourierStage,
    setIsDeclineSheetVisible: lifecycle.setIsDeclineSheetVisible,
    setDeclineSheetState: lifecycle.setDeclineSheetState,
    setIsPickupSheetVisible: lifecycle.setIsPickupSheetVisible,
    setPickupSheetState: lifecycle.setPickupSheetState,
    setActiveOrderPhase: lifecycle.setActiveOrderPhase,
    setActiveOrderMessages: chatModel.setActiveOrderMessages,
    setCaptainPodState: podUpload.setCaptainPodState,
    setActiveOrderExpanded: orderModel.setActiveOrderExpanded,
  });

  const pushLocation = React.useCallback((push: DshCaptainLocationPush) => {
    return captainOrderRuntime.pushLocation(push);
  }, [captainOrderRuntime]);

  return useDshCaptainSurfacePresenterModel({
    captainRuntimeId,
    route,
    activeAssignmentId: contextAssignmentId,
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
  });
}
