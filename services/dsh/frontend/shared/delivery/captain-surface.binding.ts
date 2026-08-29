import React from 'react';
import { useDeliveryLifecycle } from './delivery.lifecycle';
import { useCaptainDeliveryActions } from './delivery.actions';
import { usePodUploadFlow } from '../media/pod/pod-upload-flow';
import { useCaptainOrderModel } from '../orders/captain-order.model';
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
  const inboxModel = useCaptainInboxModel(captainRuntimeId);

  const operationalAssignmentId = inboxModel.operationalAssignment?.id || '';
  const contextAssignmentId = routeAssignmentId || operationalAssignmentId;
  const operationalCommandAssignmentId =
    operationalAssignmentId && (!routeAssignmentId || routeAssignmentId === operationalAssignmentId)
      ? operationalAssignmentId
      : '';
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
    setCaptainAppMode: profileModel.setCaptainAppMode,
  });

  const resetOrderState = React.useCallback(() => {
    orderModel.setActiveOrderExpanded(false);
    podUpload.resetPodFields();
  }, [orderModel, podUpload]);

  const deliveryActions = useCaptainDeliveryActions({
    captainRuntimeId,
    activeAssignmentId: operationalCommandAssignmentId,
    resetOrderState,
    refreshInbox: inboxModel.refresh,
    setInboxState: lifecycle.setInboxState,
    setIsDeclineSheetVisible: lifecycle.setIsDeclineSheetVisible,
    setDeclineSheetState: lifecycle.setDeclineSheetState,
    setDeliveryActionState: lifecycle.setDeliveryActionState,
    setDeliveryActionMessage: lifecycle.setDeliveryActionMessage,
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
    serviceModeModel,
    deliveryActions,
    pushLocation,
    inboxModel,
  });
}
