import {
  DSH_DELIVERY_MODE_DEFINITIONS,
  getDshDeliveryModeDefinition,
  type DshFulfillmentDeliveryMode,
} from '../delivery/delivery.contract';
import type { DshOnDemandPolicy, DshSurfaceId } from '../operations/dsh-operational.contract';
import {
  getDshSignalActorRoute,
  type DshSignalEventKind,
  type DshSignalPriority,
} from '../marketing/dsh-signal-layer.model';
import type { DshOrderJourneyStageId, DshOrderLifecycleStatus } from './orders.state-machine';

type RecommendationProduct = {
  id: string;
  title: string;
  priceLabel: string;
  priceValue: number;
  imageUri?: string;
  description?: string;
};

type CartItem = {
  id: string;
  title: string;
  priceLabel?: string;
  priceValue?: number;
  qty?: number;
  storeId?: string;
  storeName?: string;
};

export type DshCaptainOrderId = string;
export type DshCaptainOrderServiceType = 'standard' | 'awnak' | 'shein-final-mile';
export type DshCaptainOrderMode =
  | 'full'
  | 'inbox'
  | 'detail'
  | 'chat'
  | 'bell'
  | 'accept'
  | 'offer-reject'
  | 'pickup'
  | 'deliver'
  | 'proof'
  | 'orders-list'
  | 'orders-offers-list'
  | 'order-get'
  | 'order-details';
export type DshCaptainOrderStage = 'offer' | 'accepted' | 'pickup' | 'delivery' | 'proof' | 'closed';

export type DshCaptainOrderBellItem = {
  /** Dispatch assignment id — the id every accept/decline/pickup/deliver mutation targets. */
  id: DshCaptainOrderId;
  /** The underlying order id, for display only; never used as a mutation target. */
  orderId: DshCaptainOrderId;
  kind: 'incoming-offer' | 'active';
  serviceType: DshCaptainOrderServiceType;
  readonly fulfillmentMode: 'bthwani_delivery';
  title: string;
  subtitle: string;
  meta: string;
};

export type DshCaptainOrderMessage = {
  id: string;
  sender: string;
  text: string;
  time: string;
  side: 'start' | 'end';
};

export type DshCaptainOrderAction =
  | 'accept'
  | 'order-offer-reject'
  | 'pickup'
  | 'deliver'
  | 'proof-upload'
  | 'back-to-inbox'
  | 'next-order';

export type DshCaptainOrderProofStatus = 'idle' | 'pending' | 'uploaded' | 'verified' | 'failed';
export type DshCaptainOrdersScreenState =
  | 'ready'
  | 'loading'
  | 'empty'
  | 'delivered'
  | 'error'
  | 'availability-toggle'
  | 'offer-accepting'
  | 'offer-accepted'
  | 'loading-assignment';

export type DshCaptainOrderDetailSummary = {
  orderId: DshCaptainOrderId;
  pickupLabel: string;
  dropoffLabel: string;
  etaLabel: string;
  currentStageLabel: string;
  nextActionLabel: string;
};

export type DshPartnerOrderAlertId =
  | 'order_needs_accept'
  | 'order_sla_risk'
  | 'order_ready'
  | 'order_handoff_pending'
  | 'order_issue_required'
  | 'order_rejected'
  | 'order_store_delivered';
export type DshPartnerOrderAlertStatus = 'new' | 'seen';
export type DshPartnerOrderAlertItem = {
  id: string;
  orderId: string;
  alertId: DshPartnerOrderAlertId;
  title: string;
  description: string;
  timeLabel: string;
  status: DshPartnerOrderAlertStatus;
  urgent?: boolean;
};

export type DshPartnerOrderConversationMode = DshFulfillmentDeliveryMode;
export type DshPartnerOrderConversationMessage = {
  id: string;
  authorLabel: string;
  body: string;
  timestampLabel: string;
  acknowledged?: boolean;
};
export type DshPartnerOrderConversationVisibility = 'enabled' | 'disabled-for-mode';

export function shouldShowDshPartnerOrderConversation(
  mode: DshPartnerOrderConversationMode
): DshPartnerOrderConversationVisibility {
  return mode === 'bthwani_delivery' ? 'disabled-for-mode' : 'enabled';
}

export type DshPlaceholderStatus =
  | 'ACCEPTED_PREVIEW_LABEL'
  | 'BLOCKED_BY_CONTRACT'
  | 'BLOCKED_BY_WLT'
  | 'MUST_REPLACE_WITH_PREVIEW_UI';

export type DshLookupFieldId = 'phone' | 'orderId' | 'customerId' | 'ticketId';
type DshLookupInput = {
  readonly key: DshLookupFieldId;
  readonly label: string;
  readonly value: string;
  readonly summaryFirst: true;
};

type DshVerificationStatus = 'required' | 'verified' | 'blocked';
type DshVerificationStep = {
  readonly stepId: string;
  readonly label: string;
  readonly completed: boolean;
};

export type DshSignalRoute = {
  readonly signalKind: DshSignalEventKind;
  readonly routeId: string;
  readonly auditRequired: boolean;
  readonly priority: DshSignalPriority;
  readonly priorityLabel: string;
};

export type DshRouteHintedAction = {
  readonly actionId: string;
  readonly label: string;
  readonly routeHint: string;
  readonly onDemandPolicy: DshOnDemandPolicy;
  readonly routeId?: string;
  readonly readOnly?: boolean;
  readonly auditRequired?: boolean;
  readonly reasonRequired?: boolean;
};

export type DshReadOnlyFinanceVisibility = {
  readonly paymentVisibility: string;
  readonly refundVisibility: string;
  readonly settlementVisibility?: string;
  readonly readOnly: boolean;
  readonly mutationForbidden: boolean;
  readonly calculationTruthOwner: string;
  readonly routeHint: string;
  readonly onDemandPolicy: string;
  readonly placeholderClassification: DshPlaceholderStatus;
};

export type DshGlobalControlLink = DshRouteHintedAction & {
  readonly surfaceId: DshSurfaceId;
  readonly sectionId: DshControlPanelSectionId;
};

export type DshOrderRescueSeverity = 'warning' | 'danger';
export type DshOrderRescueReason =
  | 'item_unavailable'
  | 'customer_not_reachable'
  | 'store_closed_after_order'
  | 'captain_no_show'
  | 'captain_declined'
  | 'pickup_failed'
  | 'handoff_mismatch'
  | 'delivery_failed'
  | 'address_issue'
  | 'payment_failure'
  | 'wlt_visibility';
export type DshOrderRescueOwner = 'support' | 'operations' | 'partner' | 'captain' | 'wlt_reference_only';
export type DshOrderRescueNextActionId =
  | 'replace_item'
  | 'remove_item'
  | 'wait_customer'
  | 'change_delivery_mode'
  | 'reassign_captain'
  | 'convert_to_support_exception'
  | 'create_follow_up_task'
  | 'open_wlt_visibility';

export type DshOrderRescueCase = {
  readonly rescueId: string;
  readonly orderId: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly issueKind: DshOrderRescueReason;
  readonly severity: DshOrderRescueSeverity;
  readonly blocker: string;
  readonly allowedActions: readonly string[];
  readonly forbiddenActions: readonly string[];
  readonly nextBestAction: string;
  readonly onDemandPolicy: DshOnDemandPolicy;
  readonly wltBoundary: string;
  readonly crossSurfaceLinks: readonly DshGlobalControlLink[];
  readonly rescueReasonSelector: {
    readonly selectedReason: DshOrderRescueReason;
    readonly options: readonly DshOrderRescueReason[];
    readonly previewClassification: DshPlaceholderStatus;
  };
  readonly ownerSelection: {
    readonly selectedOwner: DshOrderRescueOwner;
    readonly options: readonly DshOrderRescueOwner[];
    readonly previewClassification: DshPlaceholderStatus;
  };
  readonly nextActionSelector: {
    readonly selectedAction: DshOrderRescueNextActionId;
    readonly options: readonly DshOrderRescueNextActionId[];
    readonly previewClassification: DshPlaceholderStatus;
  };
  readonly requiredEvidence: {
    readonly reason: string;
    readonly operatorNote: string;
    readonly affectedEntity: string;
    readonly auditRequired: true;
    readonly reasonRequired: true;
    readonly previewClassification: DshPlaceholderStatus;
  };
  readonly supportHandoff: {
    readonly ticketLink: string;
    readonly escalationOwner: string;
    readonly sla: string;
    readonly routeHint: string;
    readonly previewClassification: DshPlaceholderStatus;
  };
  readonly wltImpactVisibility: DshReadOnlyFinanceVisibility;
  readonly decisionSignal: DshSignalRoute;
};

const ORDER_RESCUE_REASONS: readonly DshOrderRescueReason[] = [
  'item_unavailable',
  'customer_not_reachable',
  'store_closed_after_order',
  'captain_no_show',
  'captain_declined',
  'pickup_failed',
  'handoff_mismatch',
  'delivery_failed',
  'address_issue',
  'payment_failure',
  'wlt_visibility',
] as const;

const ORDER_RESCUE_OWNERS: readonly DshOrderRescueOwner[] = [
  'support',
  'operations',
  'partner',
  'captain',
  'wlt_reference_only',
] as const;

const ORDER_RESCUE_ACTIONS: readonly DshOrderRescueNextActionId[] = [
  'replace_item',
  'remove_item',
  'wait_customer',
  'change_delivery_mode',
  'reassign_captain',
  'convert_to_support_exception',
  'create_follow_up_task',
  'open_wlt_visibility',
] as const;

export type SheinProxyStage =
  | 'intake_review'
  | 'quote_pending'
  | 'customer_approval'
  | 'batch_pending'
  | 'purchased'
  | 'inbound'
  | 'sorting'
  | 'ready_for_delivery'
  | 'captain_assignment'
  | 'delivered'
  | 'exception';

export const SHEIN_PROXY_STAGE_LABELS: Record<SheinProxyStage, string> = {
  intake_review: 'مراجعة الطلب',
  quote_pending: 'بانتظار التسعير',
  customer_approval: 'موافقة العميل',
  batch_pending: 'بانتظار الدفعة',
  purchased: 'تم الشراء',
  inbound: 'في الطريق للاستقبال',
  sorting: 'قيد الفرز',
  ready_for_delivery: 'جاهز للتسليم',
  captain_assignment: 'إسناد الكابتن',
  delivered: 'تم التسليم',
  exception: 'استثناء',
};

export type AwnakStage =
  | 'intake'
  | 'quote_review'
  | 'dispatch_pending'
  | 'assigned'
  | 'in_progress'
  | 'proof_review'
  | 'completed'
  | 'cancelled'
  | 'escalated';

export const AWNAK_STAGE_LABELS: Record<AwnakStage, string> = {
  intake: 'استلام الطلب',
  quote_review: 'مراجعة السعر',
  dispatch_pending: 'قيد الإسناد',
  assigned: 'تم الإسناد',
  in_progress: 'قيد التنفيذ',
  proof_review: 'مراجعة الإثبات',
  completed: 'مكتمل',
  cancelled: 'ملغى',
  escalated: 'مصعّد',
};

type DshOpsMonitoringItem = {
  readonly entityId: string;
  readonly entityLabel: string;
  readonly lifecycleState: string;
  readonly affectedSurface: 'control-panel' | 'app-client' | 'app-partner' | 'app-captain' | 'app-field';
  readonly ownerQueue: string;
  readonly status: string;
  readonly statusTone: 'neutral' | 'success' | 'warning' | 'danger';
  readonly primaryAction: string;
  readonly secondaryAction?: string;
  readonly routeHint: string;
  readonly evidenceNeeded: boolean;
  readonly onDemandDetailPolicy: 'summary-only' | 'detail-on-open' | 'evidence-on-open';
  readonly supportTicketId?: string;
  readonly auditEntryId?: string;
};

type DshWltFinanceAlert = {
  readonly alertId: string;
  readonly domain: 'payment' | 'refund' | 'settlement' | 'payout' | 'commission';
  readonly label: string;
  readonly count: number;
  readonly statusTone: 'neutral' | 'success' | 'warning' | 'danger';
  readonly wltBridgeNote: string;
  readonly routeHint: string;
};

export const EXCEPTION_TICKET_MAP: Readonly<Record<string, { supportTicketId: string; auditEntryId?: string }>> = {
  'EX-4101': { supportTicketId: 'TK-5101', auditEntryId: 'AU-7001' },
  'EX-4102': { supportTicketId: 'TK-5102', auditEntryId: 'AU-7002' },
  'EX-4103': { supportTicketId: 'TK-5103' },
};

export const DISPATCH_LIFECYCLE_STATE_MAP: Readonly<Record<string, DshOrderLifecycleStatus>> = {
  'DA-2001': 'captain_assignment',
  'DA-2002': 'reassignment_required',
  'DA-2003': 'captain_unavailable',
};

// ─── Downstream transition handoffs ───────────────────────────────────────────

export type DshHandoffActor =
  | 'client'
  | 'partner'
  | 'captain'
  | 'field'
  | 'operations'
  | 'support'
  | 'system'
  | 'wlt';

export type DshSurfaceHandoffObservation = {
  readonly surfaceId: DshSurfaceId;
  readonly label: string;
  readonly uiStateHint: string;
  readonly actionRequired: boolean;
  readonly actionLabel: string;
  readonly readOnly: boolean;
  readonly applicableModes: readonly DshFulfillmentDeliveryMode[];
};

export type DshHandoffWltImpact = {
  readonly eventKind: 'payment' | 'fee' | 'refund' | 'cod_accrual' | 'settlement_trigger' | 'none';
  readonly displayLabel: string;
  readonly isDebit: boolean;
  readonly isCredit: boolean;
  readonly dshReadOnly: true;
  readonly contractState: 'DSH_WLT_READ_ONLY_REFERENCE';
};

export type DshOrderLifecycleHandoff = {
  readonly handoffId: string;
  readonly fromStage: DshOrderJourneyStageId | null;
  readonly toStage: DshOrderJourneyStageId;
  readonly triggerActor: DshHandoffActor;
  readonly description: string;
  readonly applicableModes: readonly DshFulfillmentDeliveryMode[];
  readonly surfaceObservations: readonly DshSurfaceHandoffObservation[];
  readonly wltImpact: DshHandoffWltImpact;
  readonly signalKind?: DshSignalEventKind;
  readonly auditRequired: boolean;
};

const NO_WLT_IMPACT: DshHandoffWltImpact = {
  eventKind: 'none',
  displayLabel: 'لا أثر مالي مباشر',
  isDebit: false,
  isCredit: false,
  dshReadOnly: true,
  contractState: 'DSH_WLT_READ_ONLY_REFERENCE',
};

export const DSH_ORDER_LIFECYCLE_HANDOFFS: readonly DshOrderLifecycleHandoff[] = [
  {
    handoffId: 'payment_pending',
    fromStage: null,
    toStage: 'payment_pending',
    triggerActor: 'client',
    description: 'العميل يُرسل طلب الدفع — WLT يتحقق من صحة الوسيلة والرصيد',
    applicableModes: [],
    surfaceObservations: [
      { surfaceId: 'app-client', label: 'شاشة تأكيد الدفع تُعرض', uiStateHint: 'payment_pending', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: [] },
      { surfaceId: 'control-panel', label: 'لا إجراء — WLT يعالج', uiStateHint: 'monitoring', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: [] },
    ],
    wltImpact: { eventKind: 'payment', displayLabel: 'بدء تحقق الدفع من WLT', isDebit: false, isCredit: false, dshReadOnly: true, contractState: 'DSH_WLT_READ_ONLY_REFERENCE' },
    auditRequired: false,
  },
  {
    handoffId: 'payment_failed',
    fromStage: 'payment_pending',
    toStage: 'payment_failed',
    triggerActor: 'wlt',
    description: 'WLT رفض الدفع — العميل يرى رسالة الفشل ويجب إعادة المحاولة أو تغيير الوسيلة',
    applicableModes: [],
    surfaceObservations: [
      { surfaceId: 'app-client', label: 'رسالة فشل الدفع + خيار إعادة المحاولة', uiStateHint: 'payment_failed', actionRequired: true, actionLabel: 'إعادة المحاولة أو تغيير الوسيلة', readOnly: false, applicableModes: [] },
      { surfaceId: 'control-panel', label: 'تنبيه payment_failed في Operations', uiStateHint: 'alert', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: [] },
    ],
    wltImpact: { eventKind: 'payment', displayLabel: 'فشل الدفع — لا خصم نهائي', isDebit: false, isCredit: false, dshReadOnly: true, contractState: 'DSH_WLT_READ_ONLY_REFERENCE' },
    signalKind: 'payment_failed',
    auditRequired: true,
  },
  {
    handoffId: 'order_submitted_to_ops',
    fromStage: 'payment_pending',
    toStage: 'order_submitted',
    triggerActor: 'system',
    description: 'الدفع نجح — الطلب يدخل قائمة مراجعة العمليات',
    applicableModes: [],
    surfaceObservations: [
      { surfaceId: 'app-client', label: 'شاشة تتبع تُعرض — "قيد المراجعة"', uiStateHint: 'order_created', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: [] },
      { surfaceId: 'app-partner', label: 'لا إشعار بعد — ينتظر موافقة العمليات', uiStateHint: 'waiting', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: [] },
      { surfaceId: 'app-captain', label: 'لا إسناد بعد', uiStateHint: 'not_applicable', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: ['bthwani_delivery'] },
      { surfaceId: 'control-panel', label: 'الطلب يظهر في قائمة Operations للمراجعة', uiStateHint: 'operations_review', actionRequired: true, actionLabel: 'موافقة أو رفض الطلب', readOnly: false, applicableModes: [] },
    ],
    wltImpact: { eventKind: 'payment', displayLabel: 'تأكيد الدفع — WLT احتجز المبلغ', isDebit: true, isCredit: false, dshReadOnly: true, contractState: 'DSH_WLT_READ_ONLY_REFERENCE' },
    signalKind: 'order_created',
    auditRequired: false,
  },
  {
    handoffId: 'operations_approved',
    fromStage: 'order_submitted',
    toStage: 'operations_approved',
    triggerActor: 'operations',
    description: 'مشرف العمليات يوافق على الطلب — يُرسَل للشريك للتجهيز',
    applicableModes: [],
    surfaceObservations: [
      { surfaceId: 'app-client', label: 'تحديث التتبع — "تم التأكيد"', uiStateHint: 'order_confirmed', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: [] },
      { surfaceId: 'app-partner', label: 'إشعار طلب جديد يصل — يجب قبوله', uiStateHint: 'new_order_alert', actionRequired: true, actionLabel: 'قبول الطلب والبدء بالتجهيز', readOnly: false, applicableModes: [] },
      { surfaceId: 'app-captain', label: 'لا إسناد بعد — ينتظر جاهزية المتجر', uiStateHint: 'waiting', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: ['bthwani_delivery'] },
      { surfaceId: 'control-panel', label: 'الطلب انتقل لـ "قيد التجهيز عند الشريك"', uiStateHint: 'monitoring', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: [] },
    ],
    wltImpact: NO_WLT_IMPACT,
    signalKind: 'partner_accepted',
    auditRequired: true,
  },
  {
    handoffId: 'partner_rejected',
    fromStage: 'order_submitted',
    toStage: 'partner_rejected',
    triggerActor: 'partner',
    description: 'الشريك رفض الطلب — يجب تصعيد للعمليات وإشعار العميل',
    applicableModes: [],
    surfaceObservations: [
      { surfaceId: 'app-client', label: 'إشعار: "المتجر غير قادر على تلبية طلبك"', uiStateHint: 'exception', actionRequired: true, actionLabel: 'تواصل مع الدعم أو اختر بديلًا', readOnly: false, applicableModes: [] },
      { surfaceId: 'app-partner', label: 'سجل رفض الطلب يُعرض', uiStateHint: 'rejected_record', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: [] },
      { surfaceId: 'control-panel', label: 'تنبيه عاجل: partner_rejected — يجب إجراء rescue', uiStateHint: 'rescue_required', actionRequired: true, actionLabel: 'فتح Order Rescue', readOnly: false, applicableModes: [] },
    ],
    wltImpact: { eventKind: 'refund', displayLabel: 'استرداد محتمل — WLT يُقيّم', isDebit: false, isCredit: true, dshReadOnly: true, contractState: 'DSH_WLT_READ_ONLY_REFERENCE' },
    signalKind: 'partner_rejected_order',
    auditRequired: true,
  },
  {
    handoffId: 'ready_for_pickup_captain_assigned',
    fromStage: 'ready_for_pickup',
    toStage: 'captain_assigned',
    triggerActor: 'operations',
    description: 'المتجر جهّز الطلب — يُسند كابتن ويبدأ التتبع',
    applicableModes: ['bthwani_delivery'],
    surfaceObservations: [
      { surfaceId: 'app-client', label: 'تتبع: "تم تعيين الكابتن"', uiStateHint: 'tracking_active', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: ['bthwani_delivery'] },
      { surfaceId: 'app-partner', label: 'حالة الطلب: "في انتظار الكابتن"', uiStateHint: 'waiting_captain', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: ['bthwani_delivery'] },
      { surfaceId: 'app-captain', label: 'عرض طلب جديد يصل — يجب قبوله', uiStateHint: 'bell_offer', actionRequired: true, actionLabel: 'قبول الطلب', readOnly: false, applicableModes: ['bthwani_delivery'] },
      { surfaceId: 'control-panel', label: 'إسناد الكابتن مرئي في Operations', uiStateHint: 'dispatch_monitoring', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: ['bthwani_delivery'] },
    ],
    wltImpact: NO_WLT_IMPACT,
    signalKind: 'captain_assigned',
    auditRequired: false,
  },
  {
    handoffId: 'captain_declined_reassignment',
    fromStage: 'captain_assigned',
    toStage: 'exception',
    triggerActor: 'captain',
    description: 'الكابتن رفض الطلب — يجب إعادة الإسناد من العمليات',
    applicableModes: ['bthwani_delivery'],
    surfaceObservations: [
      { surfaceId: 'app-client', label: 'لا تغيير مرئي — التتبع يظل "قيد التعيين"', uiStateHint: 'tracking_active', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: ['bthwani_delivery'] },
      { surfaceId: 'app-captain', label: 'الطلب يُزال من قائمة الكابتن', uiStateHint: 'offer_declined', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: ['bthwani_delivery'] },
      { surfaceId: 'control-panel', label: 'تنبيه: captain_declined — إعادة إسناد مطلوبة', uiStateHint: 'reassignment_required', actionRequired: true, actionLabel: 'إسناد كابتن آخر', readOnly: false, applicableModes: ['bthwani_delivery'] },
    ],
    wltImpact: NO_WLT_IMPACT,
    signalKind: 'captain_declined',
    auditRequired: true,
  },
  {
    handoffId: 'picked_up',
    fromStage: 'captain_assigned',
    toStage: 'picked_up',
    triggerActor: 'captain',
    description: 'الكابتن استلم الطلب من المتجر — يبدأ التوصيل',
    applicableModes: ['bthwani_delivery'],
    surfaceObservations: [
      { surfaceId: 'app-client', label: 'تتبع: "في الطريق إليك"', uiStateHint: 'tracking_active', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: ['bthwani_delivery'] },
      { surfaceId: 'app-partner', label: 'حالة الطلب: "تم الاستلام"', uiStateHint: 'order_picked_up', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: ['bthwani_delivery'] },
      { surfaceId: 'app-captain', label: 'شاشة التوصيل تُعرض — الخريطة + عنوان العميل', uiStateHint: 'pickup_dropoff', actionRequired: true, actionLabel: 'متابعة للتسليم', readOnly: false, applicableModes: ['bthwani_delivery'] },
      { surfaceId: 'control-panel', label: 'مرحلة: "الكابتن في الطريق" في Operations', uiStateHint: 'live_tracking', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: ['bthwani_delivery'] },
    ],
    wltImpact: { eventKind: 'cod_accrual', displayLabel: 'COD في حيازة الكابتن — ذمة معلقة لـ WLT', isDebit: false, isCredit: false, dshReadOnly: true, contractState: 'DSH_WLT_READ_ONLY_REFERENCE' },
    signalKind: 'picked_up',
    auditRequired: false,
  },
  {
    handoffId: 'delivered_pod',
    fromStage: 'enroute_to_customer',
    toStage: 'post_delivery',
    triggerActor: 'captain',
    description: 'الكابتن سلّم الطلب ورفع إثبات التسليم (PoD) — يُغلق الطلب ويبدأ حساب التسوية',
    applicableModes: ['bthwani_delivery'],
    surfaceObservations: [
      { surfaceId: 'app-client', label: 'تتبع: "تم التسليم" + تقييم اختياري', uiStateHint: 'delivered', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: ['bthwani_delivery'] },
      { surfaceId: 'app-partner', label: 'الطلب يُغلق — حالة: "تم التوصيل"', uiStateHint: 'order_closed', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: ['bthwani_delivery'] },
      { surfaceId: 'app-captain', label: 'شاشة ما بعد التسليم — COD + ملخص', uiStateHint: 'post_delivery', actionRequired: true, actionLabel: 'تأكيد إيداع COD', readOnly: false, applicableModes: ['bthwani_delivery'] },
      { surfaceId: 'control-panel', label: 'الطلب يُغلق في Operations + يُضاف لقائمة COD المستحقة', uiStateHint: 'closed_pending_settlement', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: ['bthwani_delivery'] },
      { surfaceId: 'wlt-finance', label: 'بدء احتساب تسوية الكابتن — COD + عمولة', uiStateHint: 'settlement_calculation', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: ['bthwani_delivery'] },
    ],
    wltImpact: { eventKind: 'settlement_trigger', displayLabel: 'PoD أكّد التسليم — WLT يبدأ احتساب التسوية', isDebit: false, isCredit: true, dshReadOnly: true, contractState: 'DSH_WLT_READ_ONLY_REFERENCE' },
    signalKind: 'delivered',
    auditRequired: true,
  },
  {
    handoffId: 'delivery_failed_rescue',
    fromStage: 'enroute_to_customer',
    toStage: 'exception',
    triggerActor: 'captain',
    description: 'فشل التسليم — يجب تصعيد للدعم وفتح Order Rescue',
    applicableModes: ['bthwani_delivery'],
    surfaceObservations: [
      { surfaceId: 'app-client', label: 'إشعار: "تعذّر التسليم" + خيار الدعم', uiStateHint: 'exception', actionRequired: true, actionLabel: 'التواصل مع الدعم', readOnly: false, applicableModes: ['bthwani_delivery'] },
      { surfaceId: 'app-captain', label: 'شاشة الإبلاغ عن العائق — سبب + ملاحظة', uiStateHint: 'delivery_exception_report', actionRequired: true, actionLabel: 'إبلاغ عن سبب الفشل', readOnly: false, applicableModes: ['bthwani_delivery'] },
      { surfaceId: 'control-panel', label: 'تنبيه عاجل: delivery_failed — Order Rescue مطلوب', uiStateHint: 'rescue_required', actionRequired: true, actionLabel: 'فتح Order Rescue', readOnly: false, applicableModes: ['bthwani_delivery'] },
    ],
    wltImpact: { eventKind: 'refund', displayLabel: 'استرداد محتمل — WLT يُقيّم حسب سياسة الإلغاء', isDebit: false, isCredit: true, dshReadOnly: true, contractState: 'DSH_WLT_READ_ONLY_REFERENCE' },
    signalKind: 'delivery_failed',
    auditRequired: true,
  },
  {
    handoffId: 'cancelled_refund_pending',
    fromStage: 'cancellation_requested',
    toStage: 'refund_pending',
    triggerActor: 'system',
    description: 'الطلب مُلغى — WLT يُعالج الاسترداد',
    applicableModes: [],
    surfaceObservations: [
      { surfaceId: 'app-client', label: 'إشعار: "جارٍ معالجة الاسترداد"', uiStateHint: 'refund_pending', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: [] },
      { surfaceId: 'app-partner', label: 'الطلب يُغلق بحالة ملغى', uiStateHint: 'order_cancelled', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: [] },
      { surfaceId: 'app-captain', label: 'الطلب يُزال من القائمة', uiStateHint: 'order_removed', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: ['bthwani_delivery'] },
      { surfaceId: 'control-panel', label: 'سجل الإلغاء + تتبع الاسترداد في Finance', uiStateHint: 'refund_monitoring', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: [] },
      { surfaceId: 'wlt-finance', label: 'قيد استرداد في دفتر الأستاذ', uiStateHint: 'refund_ledger_entry', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: [] },
    ],
    wltImpact: { eventKind: 'refund', displayLabel: 'WLT يُعالج الاسترداد إلى وسيلة الدفع الأصلية', isDebit: false, isCredit: true, dshReadOnly: true, contractState: 'DSH_WLT_READ_ONLY_REFERENCE' },
    signalKind: 'refund_pending_wlt',
    auditRequired: true,
  },
  {
    handoffId: 'partner_delivery_dispatched',
    fromStage: 'order_received',
    toStage: 'preparing',
    triggerActor: 'partner',
    description: 'توصيل المتجر: الشريك قبل الطلب وأرسل موصله',
    applicableModes: ['partner_delivery'],
    surfaceObservations: [
      { surfaceId: 'app-client', label: 'تتبع: "موصل المتجر في الطريق"', uiStateHint: 'tracking_active', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: ['partner_delivery'] },
      { surfaceId: 'app-partner', label: 'حالة الطلب: "موصل مُرسَل"', uiStateHint: 'courier_dispatched', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: ['partner_delivery'] },
      { surfaceId: 'control-panel', label: 'مراقبة store-delivery في Operations', uiStateHint: 'store_delivery_monitoring', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: ['partner_delivery'] },
    ],
    wltImpact: NO_WLT_IMPACT,
    signalKind: 'partner_accepted',
    auditRequired: false,
  },
  {
    handoffId: 'pickup_ready_client_collect',
    fromStage: 'preparing',
    toStage: 'delivered',
    triggerActor: 'partner',
    description: 'استلام بنفسك: المتجر جاهز — العميل يُخطَر ويأتي للاستلام',
    applicableModes: ['pickup'],
    surfaceObservations: [
      { surfaceId: 'app-client', label: 'إشعار: "طلبك جاهز للاستلام"', uiStateHint: 'pickup_ready', actionRequired: true, actionLabel: 'اذهب للاستلام', readOnly: false, applicableModes: ['pickup'] },
      { surfaceId: 'app-partner', label: 'حالة: "ينتظر العميل"', uiStateHint: 'waiting_client', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: ['pickup'] },
      { surfaceId: 'control-panel', label: 'مراقبة store-readiness في Operations', uiStateHint: 'monitoring', actionRequired: false, actionLabel: '', readOnly: true, applicableModes: ['pickup'] },
    ],
    wltImpact: NO_WLT_IMPACT,
    auditRequired: false,
  },
];

export function getHandoffsForSurface(surfaceId: DshSurfaceId): readonly DshOrderLifecycleHandoff[] {
  return DSH_ORDER_LIFECYCLE_HANDOFFS.filter((h) =>
    h.surfaceObservations.some((o) => o.surfaceId === surfaceId),
  );
}

export function getActionableHandoffsForSurface(surfaceId: DshSurfaceId): readonly DshOrderLifecycleHandoff[] {
  return DSH_ORDER_LIFECYCLE_HANDOFFS.filter((h) =>
    h.surfaceObservations.some((o) => o.surfaceId === surfaceId && o.actionRequired),
  );
}

export function getSurfaceObservation(
  handoff: DshOrderLifecycleHandoff,
  surfaceId: DshSurfaceId,
): DshSurfaceHandoffObservation | undefined {
  return handoff.surfaceObservations.find((o) => o.surfaceId === surfaceId);
}

function getHandoffsForDeliveryMode(
  mode: DshFulfillmentDeliveryMode,
): readonly DshOrderLifecycleHandoff[] {
  return DSH_ORDER_LIFECYCLE_HANDOFFS.filter(
    (h) => h.applicableModes.length === 0 || h.applicableModes.includes(mode),
  );
}

function getHandoffsWithWltImpact(): readonly DshOrderLifecycleHandoff[] {
  return DSH_ORDER_LIFECYCLE_HANDOFFS.filter((h) => h.wltImpact.eventKind !== 'none');
}

function getAuditableHandoffs(): readonly DshOrderLifecycleHandoff[] {
  return DSH_ORDER_LIFECYCLE_HANDOFFS.filter((h) => h.auditRequired);
}

// ─── Partner Order Item contract types ───────────────────────────────────────

export type PartnerOrderStatus =
  | 'new'
  | 'needs_accept'
  | 'preparation_started'
  | 'preparing'
  | 'items_ready'
  | 'ready'
  | 'handoff'
  | 'captain_assigned'
  | 'captain_arriving'
  | 'delivering'
  | 'completed'
  | 'cancelled';

export type PartnerOrderPriority = 'high' | 'normal' | 'low';

export type PartnerOrderItem = {
  id: string;
  orderCode: string;
  branchLabel: string;
  status: PartnerOrderStatus;
  priority: PartnerOrderPriority;
  orderTypeLabel: 'استلم بنفسك' | 'توصيل المتجر' | 'توصيل بثواني';
  orderMode: DshFulfillmentDeliveryMode;
  itemsCountLabel: string;
  amountLabel: string;
  createdAtLabel: string;
  elapsedLabel: string;
  nextActionLabel: string;
  urgent?: boolean;
  slaRisk?: boolean;
  unread?: boolean;
  issueRequired?: boolean;
  itemsSummaryLabel?: string;
  paymentLabel?: string;
  slaLabel?: string;
  nextOwnerLabel?: string | undefined;
};

// ---------------------------------------------------------------------------
// DSH Shared Governance Map
//
// Canonical cross-surface governance owner for DSH control-panel section metadata.
// Mobile surfaces (app-client, app-partner, app-captain, app-field) consume
// governance helpers from here without importing control-panel internals.
//
// Rules:
//  - Pure types + data + helpers only. No React, no side-effects, no backend, no mutation.
//  - Import from '@bthwani/ui-kit' is FORBIDDEN here; zero UI deps.
// ---------------------------------------------------------------------------

export type BthwaniFullStackCapabilityId =
  | 'foundation'
  | 'actor-auth-permissions'
  | 'catalog-store'
  | 'media-runtime'
  | 'cart-checkout'
  | 'order-lifecycle'
  | 'captain-delivery'
  | 'partner-operations'
  | 'field-readiness'
  | 'support-escalation'
  | 'wlt-finance-read-model'
  | 'control-panel-governance'
  | 'notifications';

export const DSH_CONTROL_PANEL_SECTION_IDS = [
  'dashboard',
  'operations',
  'support',
  'finance',
  'catalogs',
  'partners',
  'marketing',
  'platform',
  'administration',
  'hr',
] as const;

export type DshControlPanelSectionId = (typeof DSH_CONTROL_PANEL_SECTION_IDS)[number];

export type DshControlPanelGovernanceEntry = {
  readonly sectionId: DshControlPanelSectionId;
  readonly sectionLabel: string;
  readonly ownerRole: string;
  readonly relatedRegistryFlowIds: readonly string[];
  readonly relatedMobileSurfaces: readonly DshSurfaceId[];
  readonly policyOwner: DshSurfaceId;
  readonly escalationOwner: DshSurfaceId;
  readonly financeReference: 'none' | 'wlt-read-model' | 'wlt-reference-required' | 'blocked-by-policy';
  readonly varsReference: 'none' | 'platform' | 'wlt-bridge';
  readonly fullStackCapabilities: readonly BthwaniFullStackCapabilityId[];
  readonly requiredSurfaces: readonly DshSurfaceId[];
  readonly inputOwnership: 'none' | 'control-panel' | 'shared-api' | 'wlt' | 'media-runtime';
  readonly allowedActions: readonly string[];
  readonly forbiddenActions: readonly string[];
  readonly onDemandPolicySummary: readonly DshOnDemandPolicy[];
  readonly notes: string;
};

export const DSH_CONTROL_PANEL_GOVERNANCE_MAP: Readonly<Record<DshControlPanelSectionId, DshControlPanelGovernanceEntry>> = {
  dashboard: {
    sectionId: 'dashboard',
    sectionLabel: 'لوحة القيادة',
    ownerRole: 'DSH Closure Evidence Owner',
    relatedRegistryFlowIds: [
      'order-accept',
      'client-order-tracking',
      'partner-finance-bridge',
      'control-sla-policy',
      'control-escalation-queue',
    ],
    relatedMobileSurfaces: ['app-client', 'app-partner', 'app-captain', 'app-field', 'control-panel', 'wlt-finance'],
    policyOwner: 'control-panel',
    escalationOwner: 'control-panel',
    financeReference: 'wlt-read-model',
    varsReference: 'platform',
    fullStackCapabilities: ['foundation', 'control-panel-governance', 'wlt-finance-read-model'],
    requiredSurfaces: ['app-client', 'app-partner', 'app-captain', 'app-field', 'control-panel', 'wlt-finance'],
    inputOwnership: 'none',
    allowedActions: ['عرض ملخص الإغلاق', 'فتح الأدلة عند الطلب', 'توجيه المستخدم إلى القسم المالك'],
    forbiddenActions: ['اعتماد إغلاق نهائي', 'تنفيذ mutation', 'استبدال أدلة الأقسام المالكة'],
    onDemandPolicySummary: ['summary-only', 'detail-on-open', 'evidence-on-open'],
    notes: 'لوحة القيادة تعرض ملخص الإغلاق والروابط فقط. كل قرار أو إجراء يبقى داخل القسم المالك ولا يتحول dashboard إلى مالك بديل.',
  },
  operations: {
    sectionId: 'operations',
    sectionLabel: 'العمليات',
    ownerRole: 'DSH Operations Command',
    relatedRegistryFlowIds: [
      'order-accept',
      'order-get',
      'order-handoff',
      'order-prepare',
      'order-ready',
      'order-out-for-delivery',
      'client-order-tracking',
      'captain-order-pickup',
      'captain-map-navigation',
      'assisted-order-desk',
      'order-rescue',
      'ops-intervention-playbook',
    ],
    relatedMobileSurfaces: ['app-client', 'app-partner', 'app-captain', 'control-panel'],
    policyOwner: 'control-panel',
    escalationOwner: 'control-panel',
    financeReference: 'none',
    varsReference: 'platform',
    fullStackCapabilities: ['order-lifecycle', 'captain-delivery', 'partner-operations', 'notifications'],
    requiredSurfaces: ['app-client', 'app-partner', 'app-captain', 'control-panel'],
    inputOwnership: 'control-panel',
    allowedActions: ['تشغيل التنفيذ الحي', 'إعادة الإسناد', 'متابعة الضغط والسعة', 'فتح المالك الصحيح للحالة'],
    forbiddenActions: ['اعتماد مالي', 'اعتماد شريك نهائي', 'نشر كتالوج', 'إغلاق تذكرة دعم خارج مالكها'],
    onDemandPolicySummary: ['summary-only', 'detail-on-open', 'evidence-on-open'],
    notes: 'العمليات تملك التنفيذ الحي فقط. أي policy أو finance أو partner lifecycle أو catalog governance يوجّه إلى القسم المالك.',
  },
  support: {
    sectionId: 'support',
    sectionLabel: 'الدعم',
    ownerRole: 'Support and Escalation Queue Owner',
    relatedRegistryFlowIds: [
      'client-order-issue',
      'order-issue-queue',
      'order-chat-send',
      'order-chat-read-ack',
      'order-quick-reply-config',
      'order-quick-reply-settings',
      'order-quick-reply-setup',
      'captain-proof-of-delivery',
      'field-readiness-escalation',
      'control-escalation-queue',
      'customer-360',
      'manual-call-intake',
    ],
    relatedMobileSurfaces: ['app-client', 'app-partner', 'app-captain', 'app-field', 'control-panel'],
    policyOwner: 'control-panel',
    escalationOwner: 'control-panel',
    financeReference: 'wlt-reference-required',
    varsReference: 'platform',
    fullStackCapabilities: ['support-escalation', 'captain-delivery', 'field-readiness'],
    requiredSurfaces: ['app-client', 'app-partner', 'app-captain', 'app-field', 'control-panel'],
    inputOwnership: 'control-panel',
    allowedActions: ['إدارة التذاكر', 'متابعة الرسائل', 'تصعيد المتابعة', 'فتح الأدلة عند الطلب'],
    forbiddenActions: ['نسخ واجهات الموبايل كما هي', 'بدء استرداد مالي', 'تغيير policy من داخل التذكرة'],
    onDemandPolicySummary: ['summary-only', 'chat-on-open', 'evidence-on-open', 'detail-on-open'],
    notes: 'الدعم هو المالك المركزي لـ tickets والمحادثات والمتابعة بعد التصعيد. العميل يراه داخل الطلب فقط، والشريك داخل command center فقط.',
  },
  finance: {
    sectionId: 'finance',
    sectionLabel: 'المالية',
    ownerRole: 'Finance Read-Only Owner with WLT Ledger Reference',
    relatedRegistryFlowIds: [
      'partner-finance-bridge',
      'partner-settlement-summary',
      'partner-commission-summary',
      'client-cart-checkout',
    ],
    relatedMobileSurfaces: ['app-client', 'app-partner', 'app-captain', 'app-field', 'control-panel', 'wlt-finance'],
    policyOwner: 'control-panel',
    escalationOwner: 'wlt-finance',
    financeReference: 'wlt-read-model',
    varsReference: 'wlt-bridge',
    fullStackCapabilities: ['wlt-finance-read-model', 'cart-checkout', 'order-lifecycle'],
    requiredSurfaces: ['app-client', 'app-partner', 'app-captain', 'app-field', 'control-panel', 'wlt-finance'],
    inputOwnership: 'wlt',
    allowedActions: ['عرض قراءة مالية', 'فتح مرجع WLT', 'توضيح owner المالي', 'إظهار أثر الحالة فقط'],
    forbiddenActions: ['refund mutation', 'settlement mutation', 'commission mutation', 'ledger mutation'],
    onDemandPolicySummary: ['summary-only', 'detail-on-open'],
    notes: 'WLT هو ledger owner. DSH finance surfaces للقراءة والحوكمة فقط ولا تنفذ أي تعديل مالي.',
  },
  catalogs: {
    sectionId: 'catalogs',
    sectionLabel: 'الكتالوجات',
    ownerRole: 'Catalog Governance Owner',
    relatedRegistryFlowIds: [
      'inventory-adjust',
      'inventory-update',
      'items-upsert',
      'doc-upload',
      'video-upload',
      'field-store-onboarding',
      'field-store-visit',
    ],
    relatedMobileSurfaces: ['app-client', 'app-partner', 'app-field', 'control-panel'],
    policyOwner: 'control-panel',
    escalationOwner: 'control-panel',
    financeReference: 'none',
    varsReference: 'platform',
    fullStackCapabilities: ['catalog-store', 'media-runtime', 'field-readiness'],
    requiredSurfaces: ['app-client', 'app-partner', 'app-field', 'control-panel'],
    inputOwnership: 'control-panel',
    allowedActions: ['مراجعة barcode وSKU وGTIN', 'حل التعارضات', 'اعتماد النشر', 'فتح التفاصيل عند الطلب'],
    forbiddenActions: ['تحميل payload ثقيل دائمًا', 'تكرار publication logic داخل التسويق أو العمليات'],
    onDemandPolicySummary: ['summary-only', 'detail-on-open', 'evidence-on-open'],
    notes: 'الكتالوجات تملك item governance والنشر والتعارضات. partner يغيّر local override فقط وfield يجمع التحقق والأدلة.',
  },
  partners: {
    sectionId: 'partners',
    sectionLabel: 'الشركاء',
    ownerRole: 'Partner Lifecycle Owner',
    relatedRegistryFlowIds: [
      'intake-start',
      'store-nomination',
      'doc-upload',
      'field-store-onboarding',
      'field-readiness-escalation',
    ],
    relatedMobileSurfaces: ['app-partner', 'app-field', 'control-panel'],
    policyOwner: 'control-panel',
    escalationOwner: 'control-panel',
    financeReference: 'blocked-by-policy',
    varsReference: 'platform',
    fullStackCapabilities: ['field-readiness', 'partner-operations', 'catalog-store'],
    requiredSurfaces: ['app-partner', 'app-field', 'control-panel'],
    inputOwnership: 'control-panel',
    allowedActions: ['اعتماد الشريك', 'مراجعة الوثائق', 'إدارة readiness وtopology وdeactivation', 'فتح handoff للكتالوج والتسويق'],
    forbiddenActions: ['منح final approval من app-partner', 'نسخ منطق الشركاء داخل العمليات أو التسويق'],
    onDemandPolicySummary: ['summary-only', 'detail-on-open', 'evidence-on-open'],
    notes: 'الشركاء هو owner لدورة حياة الشريك كاملة. app-field يجمع البيانات، وapp-partner يظل مستهلكًا للحالة لا مالكًا نهائيًا لها.',
  },
  marketing: {
    sectionId: 'marketing',
    sectionLabel: 'التسويق',
    ownerRole: 'Campaign and Content Governance Owner',
    relatedRegistryFlowIds: [
      'video-upload',
      'store-nomination',
      'partner-finance-bridge',
    ],
    relatedMobileSurfaces: ['app-client', 'app-partner', 'control-panel'],
    policyOwner: 'control-panel',
    escalationOwner: 'control-panel',
    financeReference: 'wlt-reference-required',
    varsReference: 'platform',
    fullStackCapabilities: ['catalog-store', 'media-runtime'],
    requiredSurfaces: ['app-client', 'app-partner', 'control-panel'],
    inputOwnership: 'control-panel',
    allowedActions: ['إدارة الحملات والعروض والميديا', 'إظهار publication bridge', 'إحالة incidents إلى support أو operations'],
    forbiddenActions: ['اعتماد partner activation النهائي', 'اعتماد catalog publication النهائي بدون owner catalogs'],
    onDemandPolicySummary: ['summary-only', 'detail-on-open', 'evidence-on-open'],
    notes: 'التسويق يملك المحتوى والحملات والعروض. النشر النهائي والعلاقات المالية والتفعيل النهائي تعود لأصحابها.',
  },
  platform: {
    sectionId: 'platform',
    sectionLabel: 'المنصة',
    ownerRole: 'Platform Policy and Vars Owner',
    relatedRegistryFlowIds: [
      'control-sla-policy',
      'control-escalation-queue',
      'client-cart-checkout',
      'partner-finance-bridge',
    ],
    relatedMobileSurfaces: ['app-client', 'app-partner', 'app-captain', 'app-field', 'control-panel', 'wlt-finance'],
    policyOwner: 'control-panel',
    escalationOwner: 'control-panel',
    financeReference: 'wlt-read-model',
    varsReference: 'platform',
    fullStackCapabilities: ['foundation', 'actor-auth-permissions', 'control-panel-governance', 'notifications'],
    requiredSurfaces: ['app-client', 'app-partner', 'app-captain', 'app-field', 'control-panel', 'wlt-finance'],
    inputOwnership: 'control-panel',
    allowedActions: ['عرض vars/providers/rollouts/services/health/audit', 'إظهار scope وprecedence', 'فتح WLT bridge reference عند الحاجة'],
    forbiddenActions: ['backend/env mutation', 'provider switching الفعلي', 'finance mutation'],
    onDemandPolicySummary: ['summary-only', 'detail-on-open'],
    notes: 'platform هو owner للسياسات القابلة للضبط والـ runtime/read-only references فقط. لا يملك catalog/partner day-to-day decisions.',
  },
  administration: {
    sectionId: 'administration',
    sectionLabel: 'الإدارة',
    ownerRole: 'Roles and Approval Chain Governance Owner',
    relatedRegistryFlowIds: [
      'control-sla-policy',
      'control-escalation-queue',
    ],
    relatedMobileSurfaces: ['control-panel'],
    policyOwner: 'control-panel',
    escalationOwner: 'control-panel',
    financeReference: 'none',
    varsReference: 'platform',
    fullStackCapabilities: ['actor-auth-permissions', 'control-panel-governance'],
    requiredSurfaces: ['control-panel'],
    inputOwnership: 'control-panel',
    allowedActions: ['إدارة الأدوار', 'إظهار approval chain', 'ربط permissions بالحوكمة'],
    forbiddenActions: ['تخزين منطق تشغيلي يومي', 'تكرار sections الأخرى'],
    onDemandPolicySummary: ['summary-only', 'detail-on-open'],
    notes: 'administration يحكم الصلاحيات وسلسلة الاعتماد فقط، ولا يجب أن يتحول إلى مستودع logic تشغيلي أو مالي أو تسويقي.',
  },
  hr: {
    sectionId: 'hr',
    sectionLabel: 'الموارد البشرية',
    ownerRole: 'Control Panel HR Blocked Reference Owner',
    relatedRegistryFlowIds: [
      'control-sla-policy',
      'control-escalation-queue',
    ],
    relatedMobileSurfaces: ['control-panel'],
    policyOwner: 'control-panel',
    escalationOwner: 'control-panel',
    financeReference: 'none',
    varsReference: 'platform',
    fullStackCapabilities: ['control-panel-governance'],
    requiredSurfaces: ['control-panel'],
    inputOwnership: 'none',
    allowedActions: ['عرض حالة HR المحجوبة', 'توضيح سبب تعطيل الأفعال', 'توجيه الربط إلى backend HR لاحقًا'],
    forbiddenActions: ['إنشاء بيانات موظفين محلية', 'تفعيل إجراء HR بدون API', 'خلط HR مع administration أو operations'],
    onDemandPolicySummary: ['summary-only', 'detail-on-open'],
    notes: 'HR route موجود في الشل لكنه يبقى blocked/read-only حتى يثبت backend HR. لا يملك بيانات موظفين محلية ولا صلاحية تشغيلية حالية.',
  },
} as const;

export const DSH_CONTROL_PANEL_GOVERNANCE_LIST = DSH_CONTROL_PANEL_SECTION_IDS.map(
  (sectionId) => DSH_CONTROL_PANEL_GOVERNANCE_MAP[sectionId],
) as readonly DshControlPanelGovernanceEntry[];

export function getDshControlPanelGovernanceEntry(sectionId: DshControlPanelSectionId): DshControlPanelGovernanceEntry {
  return DSH_CONTROL_PANEL_GOVERNANCE_MAP[sectionId];
}

export function findDshControlPanelGovernanceSectionByFlowId(flowId: string): DshControlPanelGovernanceEntry | undefined {
  return DSH_CONTROL_PANEL_GOVERNANCE_LIST.find((entry) => entry.relatedRegistryFlowIds.includes(flowId));
}

export function resolveDshControlPanelSectionLabel(sectionId: DshControlPanelSectionId): string {
  return DSH_CONTROL_PANEL_GOVERNANCE_MAP[sectionId].sectionLabel;
}
