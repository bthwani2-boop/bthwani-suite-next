import React from 'react';
import type { DshDeliveryStatus } from '../shared/dispatch';
import type { DshCaptainRoute } from './dsh-captain.types';
import {
  DshCaptainRouteRenderer,
  type DshCaptainRouteRendererProps,
} from './DshCaptainRouteRenderer';
import { OperationalCaptainExecutionScreen } from './orders/OperationalCaptainExecutionScreen';

export type DshCaptainOrderJourneyRendererProps = DshCaptainRouteRendererProps & {
  readonly setRoute: (route: DshCaptainRoute) => void;
  readonly activeDeliveryStatus: DshDeliveryStatus | '';
};

export function DshCaptainOrderJourneyRenderer(
  props: DshCaptainOrderJourneyRendererProps,
): React.ReactElement {
  if (props.route !== 'map') {
    return <DshCaptainRouteRenderer {...props} />;
  }

  return (
    <OperationalCaptainExecutionScreen
      assignmentId={props.activeAssignmentId}
      orderId={props.activeOrderId}
      captainId={props.captainRuntimeId}
      currentStageLabel={props.activeSummary?.currentStageLabel ?? 'لا توجد مهمة نشطة'}
      handoffExceptionEnabled={props.activeDeliveryStatus === 'driver_arrived_store'}
      podRequired={props.captainPodRequired}
      onBack={props.onBack}
      onRefresh={props.onRetryInbox}
      onConfirmPickup={props.onConfirmPickup}
      onConfirmDelivery={props.onConfirmDelivery}
      onOpenPod={() => props.setRoute('pod-submission')}
      onPushLocation={props.onPushLocation}
    />
  );
}
