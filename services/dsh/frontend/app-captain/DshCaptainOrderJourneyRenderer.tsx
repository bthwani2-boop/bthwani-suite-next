import React from 'react';
import { View } from 'react-native';
import { StateView, spacing } from '@bthwani/ui-kit';
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
  const offerPending = props.activeDeliveryStatus === 'assigned';

  if (props.route === 'detail' && offerPending) {
    return (
      <StateView
        title="العرض ينتظر قرارك"
        description="لا يمكن بدء الاستلام أو التسليم قبل قبول عرض الإسناد من اللوحة أعلاه."
        tone="warning"
        actionLabel="العودة إلى صندوق الطلبات"
        onActionPress={props.onGoToInbox}
      />
    );
  }

  if (props.route !== 'map') {
    return <DshCaptainRouteRenderer {...props} />;
  }

  if (offerPending || !props.activeAssignmentId) {
    return (
      <StateView
        title="الخريطة التنفيذية غير متاحة"
        description="يجب قبول عرض الإسناد قبل فتح مسار التنفيذ والموقع."
        tone="warning"
        actionLabel="فتح صندوق الطلبات"
        onActionPress={props.onGoToInbox}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingBottom: props.showBottomNav ? spacing[10] + spacing[6] : 0 }}>
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
      </View>
      {props.showBottomNav ? (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000 }}>
          {props.bottomNavNode}
        </View>
      ) : null}
    </View>
  );
}
