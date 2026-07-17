import React from 'react';
import { OperatorSpecialRequestsWorkbench } from '../../shared/special-requests/OperatorSpecialRequestsWorkbench';

export type SpecialOpsWorkbenchScreenProps = {
  state?: 'ready' | 'loading' | 'error' | 'empty';
  subGroup?: string;
  hubHref?: string;
  focusParams?: any;
};

const SHEIN_STAGES = [
  'intake_review', 'quote_pending', 'customer_approval', 'batch_pending',
  'purchased', 'inbound', 'sorting', 'ready_for_delivery',
  'captain_assignment', 'out_for_delivery', 'proof_of_delivery', 'delivered', 'exception'
];

const SHEIN_LABELS: Record<string, string> = {
  intake_review: 'مراجعة أولية',
  quote_pending: 'تسعير قيد الانتظار',
  customer_approval: 'موافقة العميل',
  batch_pending: 'انتظار الشراء',
  purchased: 'تم الشراء',
  inbound: 'في المستودع',
  sorting: 'فرز وتجهيز',
  ready_for_delivery: 'جاهز للتوصيل',
  captain_assignment: 'إسناد للكابتن',
  out_for_delivery: 'في الطريق للتوصيل',
  proof_of_delivery: 'إثبات التسليم',
  delivered: 'تم التوصيل',
  exception: 'استثناء'
};

const AWNAK_STAGES = [
  'intake', 'quote_review', 'customer_approval', 'dispatch_pending',
  'assigned', 'captain_enroute_to_pickup', 'arrived_at_pickup', 'item_received',
  'in_progress', 'arrived_at_dropoff', 'proof_review', 'completed', 'escalated', 'cancelled'
];

const AWNAK_LABELS: Record<string, string> = {
  intake: 'استلام الطلب',
  quote_review: 'مراجعة التسعيرة',
  customer_approval: 'موافقة العميل',
  dispatch_pending: 'انتظار الإسناد',
  assigned: 'تم الإسناد',
  captain_enroute_to_pickup: 'في الطريق للاستلام',
  arrived_at_pickup: 'وصل لموقع الاستلام',
  item_received: 'تم استلام الغرض',
  in_progress: 'في الطريق للتسليم',
  arrived_at_dropoff: 'وصل لموقع التسليم',
  proof_review: 'مراجعة الإثبات',
  completed: 'مكتمل',
  escalated: 'مصعّد',
  cancelled: 'ملغى'
};

export function SpecialOpsWorkbenchScreen({ subGroup, hubHref, focusParams }: SpecialOpsWorkbenchScreenProps) {
  if (subGroup === 'shein') {
    return (
      <OperatorSpecialRequestsWorkbench
        requestType="SHEIN_ASSISTED_PURCHASE"
        title="عمليات شي إن (SHEIN Assisted Purchase)"
        stageOrder={SHEIN_STAGES}
        stageLabels={SHEIN_LABELS}
        hubHref={hubHref}
        subGroup={subGroup}
        focusParams={focusParams}
      />
    );
  }

  if (subGroup === 'awnak') {
    return (
      <OperatorSpecialRequestsWorkbench
        requestType="AWNAK_ERRAND"
        title="عمليات عونك (AWNAK Errand)"
        stageOrder={AWNAK_STAGES}
        stageLabels={AWNAK_LABELS}
        hubHref={hubHref}
        subGroup={subGroup}
        focusParams={focusParams}
      />
    );
  }

  return (
    <div style={{ padding: '24px', textAlign: 'center' }}>
      <p>الرجاء اختيار الخدمة الخاصة من القائمة.</p>
    </div>
  );
}

export default SpecialOpsWorkbenchScreen;

