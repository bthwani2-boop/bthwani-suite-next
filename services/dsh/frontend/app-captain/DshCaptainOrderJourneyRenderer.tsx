import React from 'react';
import { View } from 'react-native';
import { StateView, spacing } from '@bthwani/ui-kit';
import type { DshDeliveryStatus } from '../shared/dispatch';
import {
  DshCaptainRouteRenderer,
  type DshCaptainRouteRendererProps,
} from './DshCaptainRouteRenderer';
import { OperationalCaptainExecutionScreen } from './orders/OperationalCaptainExecutionScreen';

export type DshCaptainOrderJourneyRendererProps = DshCaptainRouteRendererProps & {
  readonly activeDeliveryStatus: DshDeliveryStatus | '';
  readonly isActiveAssignmentOperational: boolean;
  readonly onOpenPod: () => void;
};

export function DshCaptainOrderJourneyRenderer(
  props: DshCaptainOrderJourneyRendererProps,
): React.ReactElement {
  const requiresOperationalAssignment =
    props.route === 'map'
    || props.route === 'pickup-dropoff'
    || props.route === 'pod-submission';

  if (props.route === 'detail' && !props.isActiveAssignmentOperational) {
    return (
      <StateView
        title="المهمة ليست المهمة التشغيلية المقبولة"
        description="يمكن عرض تفاصيل المهمة، لكن لا يمكن بدء الاستلام أو التسليم قبل أن يثبت DSH أنها المهمة المقبولة والنشطة."
        tone="warning"
        actionLabel="العودة إلى صندوق الطلبات"
        onActionPress={props.onGoToInbox}
      />
    );
  }

  if (
    requiresOperationalAssignment
    && (!props.isActiveAssignmentOperational || !props.activeAssignmentId)
  ) {
    return (
      <StateView
        title="مسار التنفيذ غير متاح"
        description="لا يمكن فتح الاستلام أو التسليم أو إثبات التسليم إلا للمهمة الوحيدة التي يثبت DSH أنها مقبولة ونشطة."
        tone="warning"
        actionLabel="فتح صندوق الطلبات"
        onActionPress={props.onGoToInbox}
      />
    );
  }

  if (props.route !== 'map') {
    return <DshCaptainRouteRenderer {...props} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingBottom: props.showBottomNav ? spacing[10] + spacing[6] : 0 }}>
        <OperationalCaptainExecutionScreen
          assignmentId={props.activeAssignmentId}
          orderId={props.activeOrderId}
          workItemId={props.activeWorkItemId}
          workItemSource={props.activeWorkItemSource}
          captainId={props.captainRuntimeId}
          currentStageLabel={props.activeSummary?.currentStageLabel ?? 'لا توجد مهمة نشطة'}
          activeDeliveryAction={props.activeDeliveryAction}
          deliveryActionState={props.deliveryActionState}
          deliveryActionMessage={props.deliveryActionMessage}
          handoffExceptionEnabled={props.activeDeliveryStatus === 'driver_arrived_store' && props.activeWorkItemSource !== 'special_request'}
          onBack={props.onBack}
          onRefresh={props.onRetryInbox}
          onConfirmStoreArrival={props.onConfirmStoreArrival}
          onConfirmPickup={props.onConfirmPickup}
          onConfirmCustomerArrival={props.onConfirmCustomerArrival}
          onOpenPod={props.onOpenPod}
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
