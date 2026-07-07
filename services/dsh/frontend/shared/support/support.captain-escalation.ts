import type { DshCaptainRoute } from '../delivery';
import type { DshSignalEventKind } from '../marketing/dsh-signal-layer.model';

export type DshCaptainSupportEscalationContext = {
  readonly escalationReason: string;
  readonly captainRoute: DshCaptainRoute;
  readonly controlPanelSection: 'operations' | 'support';
  readonly controlPanelWorkspace: string;
  readonly signalKind: DshSignalEventKind;
  readonly priority: 'normal' | 'important' | 'urgent';
  readonly label: string;
};

const DSH_CAPTAIN_SUPPORT_ESCALATION_MAP: readonly DshCaptainSupportEscalationContext[] = [
  {
    escalationReason: 'pickup_failed',
    captainRoute: 'support-screen',
    controlPanelSection: 'operations',
    controlPanelWorkspace: 'order-rescue',
    signalKind: 'order_rescue_requested',
    priority: 'urgent',
    label: 'فشل الاستلام — يحتاج Order Rescue',
  },
  {
    escalationReason: 'delivery_failed',
    captainRoute: 'support-screen',
    controlPanelSection: 'operations',
    controlPanelWorkspace: 'order-rescue',
    signalKind: 'order_rescue_requested',
    priority: 'urgent',
    label: 'فشل التسليم — يحتاج Order Rescue',
  },
  {
    escalationReason: 'customer_unreachable',
    captainRoute: 'support-screen',
    controlPanelSection: 'support',
    controlPanelWorkspace: 'customer-360',
    signalKind: 'ticket_escalated',
    priority: 'important',
    label: 'العميل غير متاح — تواصل مع الدعم',
  },
  {
    escalationReason: 'address_issue',
    captainRoute: 'support-screen',
    controlPanelSection: 'support',
    controlPanelWorkspace: 'manual-call-intake',
    signalKind: 'manual_call_intake_requested',
    priority: 'important',
    label: 'مشكلة عنوان — الدعم يتواصل مع العميل',
  },
  {
    escalationReason: 'cod_dispute',
    captainRoute: 'account-finance',
    controlPanelSection: 'support',
    controlPanelWorkspace: 'customer-360',
    signalKind: 'ticket_escalated',
    priority: 'important',
    label: 'نزاع COD — مراجعة مالية مطلوبة',
  },
] as const;


