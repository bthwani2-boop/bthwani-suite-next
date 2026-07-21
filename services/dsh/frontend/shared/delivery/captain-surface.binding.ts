import React from 'react';
import { useDeliveryLifecycle } from './delivery.lifecycle';
import { useCaptainDeliveryActions } from './delivery.actions';
import { getRouteForCommandTarget } from './delivery.policy';
import { usePodUploadFlow } from '../media/pod/pod-upload-flow';
import { useCaptainOrderModel } from '../orders/captain-order.model';
import { useCaptainChatModel } from '../chat';
import { useCaptainAvailabilityModel } from './captain-availability.model';
import { useCaptainGpsModel } from './captain-gps.model';
import { useCaptainNavigationModel } from './captain-navigation.model';
import { useCaptainProfileModel } from './captain-profile.model';
import { useCaptainServiceModeModel } from './captain-service-mode.model';
import { useCaptainInboxModel } from './captain-inbox.model';
import type { CaptainSupportRoute, DshCaptainRoute } from './captain.contract';
import {
  useCaptainActiveLocationPush,
  useCaptainOrderRuntime,
  type DshCaptainLocationPush,
} from './use-captain-order-runtime';
import {
  useDshCaptainSurfaceModel as useDshCaptainSurfacePresenterModel,
  type DshCaptainNavigationCommand,
} from './captain.surface-model';

export function useDshCaptainSurfaceBinding(
  command: DshCaptainNavigationCommand | undefined,
  captainRuntimeId: string,
) {
  const safeCommand = (command || { target: 'inbox' }) as DshCaptainNavigationCommand;
  const [route, setRoute] = React.useState<DshCaptainRoute>(getRouteForCommandTarget(safeCommand.target));
  const [selectedSupportScreen, setSelectedSupportScreen] = React.useState<CaptainSupportRoute>('orders-list');

  const availabilityModel = useCaptainAvailabilityModel();
  const gpsModel = useCaptainGpsModel();
  const profileModel = useCaptainProfileModel();
  const lifecycle = useDeliveryLifecycle();
  const podUpload = usePodUploadFlow();
  const orderModel = useCaptainOrderModel();
  const chatModel = useCaptainChatModel();
  const inboxModel = useCaptainInboxModel(captainRuntimeId);
  const activeAssignment = inboxModel.findAssignment(orderModel.activeAssignmentId);

  const captainOrderRuntime = useCaptainOrderRuntime();
  useCaptainActiveLocationPush({
    activeAssignmentId: orderModel.activeAssignmentId,
    captainId: captainRuntimeId,
    lifecycleStatus: activeAssignment?.delivery.status,
  });

  const navModel = useCaptainNavigationModel({
    command: safeCommand,
    route,
    setRoute,
    setActiveAssignmentId: orderModel.setActiveAssignmentId,
    setSelectedSupportScreen,
  });

  const serviceModeModel = useCaptainServiceModeModel({
    setActiveServiceType: profileModel.setActiveServiceType,
    setRoute,
    setInboxState: lifecycle.setInboxState,
    setActiveAssignmentId: orderModel.setActiveAssignmentId,
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
    activeAssignmentId: orderModel.activeAssignmentId,
    setActiveAssignmentId: orderModel.setActiveAssignmentId,
    captainPodPhotoUri: podUpload.captainPodPhotoUri,
    captainPodMediaKey: podUpload.captainPodMediaKey,
    captainAppMode: profileModel.captainAppMode,
    setRoute,
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
    command: safeCommand,
    captainRuntimeId,
    route,
    setRoute,
    selectedSupportScreen,
    setSelectedSupportScreen,
    availabilityModel,
    gpsModel,
    profileModel,
    lifecycle,
    podUpload,
    orderModel,
    chatModel,
    navModel,
    serviceModeModel,
    deliveryActions,
    pushLocation,
    inboxModel,
  });
}
