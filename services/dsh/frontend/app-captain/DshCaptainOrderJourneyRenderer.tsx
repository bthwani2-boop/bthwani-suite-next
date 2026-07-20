import React from 'react';
import type { DshCaptainRoute } from './dsh-captain.types';
import {
  DshCaptainRouteRenderer,
  type DshCaptainRouteRendererProps,
} from './DshCaptainRouteRenderer';
import { OperationalCaptainExecutionScreen } from './orders/OperationalCaptainExecutionScreen';

export type DshCaptainOrderJourneyRendererProps = DshCaptainRouteRendererProps & {
  readonly setRoute: (route: DshCaptainRoute) => void;
};

export function DshCaptainOrderJourneyRenderer(
  props: DshCaptainOrderJourneyRendererProps,
): React.ReactElement {
  if (props.route !== 'map') {
    return <DshCaptainRouteRenderer {...props} />;
  }

  if (!props.activeAssignmentId || !props.activeOrderId || !props.activeSummary) {
    return (
      <DshCaptainRouteRenderer
        {...props}
        route="map"
      />
    );
  }

  return (
    <OperationalCaptainExecutionScreen
      assignmentId={props.activeAssignmentId}
      orderId={props.activeOrderId}
      captainId={props.captainRuntimeId}
      currentStageLabel={props.activeSummary.currentStageLabel}
      podRequired={props.captainPodRequired}
      onBack={props.onBack}
      onConfirmPickup={props.onConfirmPickup}
      onConfirmDelivery={props.onConfirmDelivery}
      onOpenPod={() => props.setRoute('pod-submission')}
      onPushLocation={props.onPushLocation}
    />
  );
}
