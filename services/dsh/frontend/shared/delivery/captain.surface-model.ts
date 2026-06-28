// Canonical location: dsh/frontend/shared/delivery/captain/captain.surface-model.ts
// Authority: dsh/frontend/shared/delivery/captain — captain surface presenter model.
// Wires topic models (navigation, chat, service-mode, pod, delivery) around shared state.
// Composition-only: no local React state or side-effects.
// No JSX. No ui-kit. No Tamagui.

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
  DshCaptainNavigationCommand,
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
import type { useCaptainNavigationModel } from './captain-navigation.model';
import type { useCaptainServiceModeModel } from './captain-service-mode.model';

export type {
  ActiveOrderPhase,
  StoreCourierStage,
  DshCaptainNavigationCommand,
  DshCaptainSurfaceState,
  DshCaptainSurfaceDerived,
} from './captain.surface.types';

export type DshCaptainSurfaceSharedProps = {
  command: DshCaptainNavigationCommand;
  captainRuntimeId: string;

  route: DshCaptainRoute;
  setRoute: React.Dispatch<React.SetStateAction<DshCaptainRoute>>;
  selectedSupportScreen: CaptainSupportRoute;
  setSelectedSupportScreen: React.Dispatch<React.SetStateAction<CaptainSupportRoute>>;

  availabilityModel: ReturnType<typeof useCaptainAvailabilityModel>;
  gpsModel: ReturnType<typeof useCaptainGpsModel>;
  profileModel: ReturnType<typeof useCaptainProfileModel>;
  lifecycle: ReturnType<typeof useDeliveryLifecycle>;
  podUpload: ReturnType<typeof usePodUploadFlow>;
  orderModel: ReturnType<typeof useCaptainOrderModel>;
  chatModel: ReturnType<typeof useCaptainChatModel>;
  navModel: ReturnType<typeof useCaptainNavigationModel>;
  serviceModeModel: ReturnType<typeof useCaptainServiceModeModel>;
  deliveryActions: ReturnType<typeof useCaptainDeliveryActions>;
  pushLocation: ReturnType<typeof useCaptainOrderRuntime>['pushLocation'];
};

export function useDshCaptainSurfaceModel({
  route,
  setRoute,
  selectedSupportScreen,
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
}: DshCaptainSurfaceSharedProps) {
  const state: DshCaptainSurfaceState = {
    activeServiceType: profileModel.activeServiceType,
    route,
    inboxState: lifecycle.inboxState,
    activeOrderId: orderModel.activeOrderId,
    selectedSupportScreen,
    isPickupSheetVisible: lifecycle.isPickupSheetVisible,
    isDeliverySheetVisible: lifecycle.isDeliverySheetVisible,
    captainAvailabilityStatus: availabilityModel.captainAvailabilityStatus,
    gpsStatus: gpsModel.gpsStatus,
    activeOrderExpanded: orderModel.activeOrderExpanded,
    activeOrderPhase: lifecycle.activeOrderPhase,
    captainAppMode: profileModel.captainAppMode,
    activeOrderDraft: chatModel.activeOrderDraft,
    activeOrderMessages: chatModel.activeOrderMessages,
    storeCourierStage: lifecycle.storeCourierStage,
    captainPodState: podUpload.captainPodState,
    captainPodPhotoUri: podUpload.captainPodPhotoUri,
    captainPodMediaKey: podUpload.captainPodMediaKey,
    isDeclineSheetVisible: lifecycle.isDeclineSheetVisible,
    declineSheetState: lifecycle.declineSheetState,
    declineOrderId: lifecycle.declineOrderId,
    pickupSheetState: lifecycle.pickupSheetState,
  };

  const derivedCallbacks = React.useMemo(() => ({
    toggleAvailability: availabilityModel.toggleAvailability,
    goToInbox: navModel.goToInbox,
    resetInboxState: () => lifecycle.setInboxState('ready'),
    toggleOrderExpanded: orderModel.toggleOrderExpanded,
  }), [availabilityModel.toggleAvailability, navModel.goToInbox, lifecycle, orderModel.toggleOrderExpanded]);

  const derived: DshCaptainSurfaceDerived = React.useMemo(
    () => buildCaptainDerived(state, derivedCallbacks),
    [state, derivedCallbacks],
  );

  const actions = {
    // Navigation
    goBack: navModel.goBack,
    openOrderDetail: navModel.openOrderDetail,
    openCaptainAccount: navModel.openCaptainAccount,
    openCaptainAccountSection: navModel.openCaptainAccountSection,
    openSupportDirectory: navModel.openSupportDirectory,
    openCaptainSupportScreen: navModel.openCaptainSupportScreen,
    goToInbox: navModel.goToInbox,

    // Route
    setRoute,

    // Inbox
    setInboxState: lifecycle.setInboxState,
    resetInboxState: () => lifecycle.setInboxState('ready' as const),
    setActiveOrderExpanded: orderModel.setActiveOrderExpanded,

    // Availability
    setCaptainAvailabilityStatus: availabilityModel.setCaptainAvailabilityStatus,
    setGpsStatus: gpsModel.setGpsStatus,

    // Lifecycle sheets
    setIsPickupSheetVisible: lifecycle.setIsPickupSheetVisible,
    setPickupSheetState: lifecycle.setPickupSheetState,
    setIsDeliverySheetVisible: lifecycle.setIsDeliverySheetVisible,
    setIsDeclineSheetVisible: lifecycle.setIsDeclineSheetVisible,
    setDeclineOrderId: lifecycle.setDeclineOrderId,
    setStoreCourierStage: lifecycle.setStoreCourierStage,
    setActiveOrderPhase: lifecycle.setActiveOrderPhase,

    // Pod upload
    setCaptainPodPhotoUri: podUpload.setCaptainPodPhotoUri,
    setCaptainPodMediaKey: podUpload.setCaptainPodMediaKey,
    setCaptainPodState: podUpload.setCaptainPodState,

    // Chat
    sendQuickMessage: chatModel.sendQuickMessage,
    setActiveOrderDraft: chatModel.setActiveOrderDraft,

    // Service mode
    handleSelectServiceType: serviceModeModel.handleSelectServiceType,
    toggleStoreCourierMode: serviceModeModel.toggleStoreCourierMode,
    openStoreCourierProof: () => podUpload.openStoreCourierProof(profileModel.captainAppMode, setRoute),

    // Location
    pushLocation,

    // Delivery lifecycle actions
    ...deliveryActions,
  };

  return { state, actions, derived };
}
