/**
 * DSH Order Journey — Shared Model
 *
 * Single source of truth for the full delivery journey shared across surfaces:
 * app-client (tracking), app-captain (execution), app-partner (preparation),
 * and control-panel/operations (approval). No backend binding.
 *
 * P0-02: Extended with full lifecycle state coverage including pre-order,
 * partner/captain exceptions, WLT refund bridge states, and audit states.
 * All 22 original statuses kept for backward compatibility.
 */

// ─── Journey stage identifiers ────────────────────────────────────────────────

export type DshOrderJourneyStageId =
  // Original 13 stages — must not be removed
  | 'order_submitted'
  | 'operations_review'
  | 'operations_approved'
  | 'order_received'
  | 'preparing'
  | 'ready_for_pickup'
  | 'captain_assigned'
  | 'picked_up'
  | 'enroute_to_customer'
  | 'near_customer'
  | 'at_door'
  | 'bell_rang'
  | 'delivered'
  // P0-02 additions — pre-order and payment
  | 'payment_pending'        // Awaiting WLT payment confirmation
  | 'payment_failed'         // WLT payment rejected
  | 'order_failed'           // Order creation failure post-payment
  // P0-02 additions — partner/captain exceptions
  | 'partner_rejected'       // Partner declined the order
  | 'exception'              // Pickup/handoff/delivery/captain exception
  // P0-02 additions — cancellation and refund
  | 'cancellation_requested' // Cancellation in progress
  | 'cancelled'              // Order cancelled
  | 'refund_pending'         // WLT refund in progress
  // P0-02 additions — post-delivery
  | 'post_delivery';         // PoD submission / rating window

export type DshOrderJourneyStage = {
  id: DshOrderJourneyStageId;
  title: string;
  detail: string;
};

// ─── Journey actors and events ─────────────────────────────────────────────────

export type DshOrderJourneyActor = 'client' | 'store' | 'partner' | 'captain' | 'support' | 'system';

type DshOrderJourneyEvent = {
  eventId: string;
  orderId: string;
  actor: DshOrderJourneyActor;
  fromStage: DshOrderJourneyStageId | null;
  toStage: DshOrderJourneyStageId;
  timestamp: string;
  note: string | null;
};

// ─── Lifecycle status ─────────────────────────────────────────────────────────
//
// Ordered by lifecycle phase. Original 22 values preserved for backward compat.
// P0-02 additions come after 'refunded' and are grouped by phase.
//
// WLT boundary rule: any state with wltImplication !== 'none' in the metadata
// registry is DSH read-only — no financial mutation allowed inside DSH.

export type DshOrderLifecycleStatus =
  // ── Original states (backward compat, do not remove) ──────────────────────
  | 'quote'
  | 'created'
  | 'confirmed'
  | 'operations_approved'
  | 'order_received'
  | 'partner_accepted'
  | 'preparing'
  | 'ready_for_pickup'
  | 'captain_assigned'
  | 'enroute_to_pickup'
  | 'arrived_at_pickup'
  | 'picked_up'
  | 'enroute_to_dropoff'
  | 'near_customer'
  | 'at_door'
  | 'bell_rang'
  | 'arrived_at_dropoff'
  | 'delivered'
  | 'cancelled'
  | 'failed'
  | 'returned'
  | 'refunded'
  // ── P0-02: Pre-order and payment states ───────────────────────────────────
  | 'checkout_intent'        // Client entering checkout flow
  | 'serviceability_quote'   // Checking serviceability + pricing quote
  | 'awaiting_wlt_payment'   // WLT processing payment — DSH read-only display
  | 'payment_failed'         // WLT rejected payment — DSH read-only display
  | 'payment_confirmed'      // WLT confirmed payment — DSH read-only display
  | 'order_draft'            // Order being assembled client-side
  | 'order_creation_failed'  // Order failed to create after payment confirmed
  | 'order_created_preview'  // Order confirmed to client, awaiting ops review
  // ── P0-02: Partner lifecycle states ───────────────────────────────────────
  | 'partner_intake'         // Order transmitted to partner, awaiting acceptance
  | 'partner_rejected'       // Partner declined the order
  | 'partner_prepare'        // Partner actively preparing (alias path)
  | 'preparation_delayed'    // Preparation exceeding SLA threshold
  | 'item_unavailable'       // One or more items unavailable / out of stock
  | 'partner_ready'          // Partner marked order ready; captain search begins
  // ── P0-02: Captain lifecycle states ───────────────────────────────────────
  | 'captain_assignment'     // System searching for an available captain
  | 'captain_accept'         // Captain accepted the assignment
  | 'captain_decline'        // Captain declined this specific assignment
  | 'captain_unavailable'    // No captain found after the search window expired
  | 'reassignment_required'  // Assigned captain cancelled; new assignment needed
  // ── P0-02: Pickup and delivery exceptions ─────────────────────────────────
  | 'pickup_failed'          // Captain arrived at store; could not collect order
  | 'out_for_delivery'       // Captain picked up; en route to dropoff (alias)
  | 'handoff_mismatch'       // Items or quantity mismatch at pickup or dropoff
  | 'delivery_failed'        // Delivery attempt failed (no access/refused/unsafe)
  | 'proof_of_delivery'      // Captain submitting PoD evidence
  // ── P0-02: Post-delivery ──────────────────────────────────────────────────
  | 'rating_pending'         // Delivered; awaiting client rating / review
  // ── P0-02: Cancellation ───────────────────────────────────────────────────
  | 'cancellation_requested' // Client or partner requested cancellation
  | 'cancellation_approved'  // Cancellation confirmed; order stopped
  // ── P0-02: WLT refund bridge — DSH displays only; WLT owns truth ──────────
  | 'refund_pending_wlt'     // WLT refund initiated — read-only in DSH
  | 'refund_rejected_wlt'    // WLT refund declined — read-only in DSH
  | 'refund_completed_wlt'   // WLT refund completed — read-only in DSH
  // ── P0-02: Support and audit ──────────────────────────────────────────────
  | 'support_exception'      // Order flagged; support ticket open
  | 'audit_required'         // Decision flagged for audit review
  | 'audit_closed';          // Audit resolved and recorded

// ─── Smart tracking snapshot ───────────────────────────────────────────────────

export type DshSmartProximityState = 'enroute' | 'near_customer' | 'at_door' | 'bell_rang';

/**
 * Snapshot produced by the order-tracking layer.
 * source: 'runtime_unbound' means no live GPS/heartbeat stream is currently wired.
 * source: 'captain_heartbeat_demo' remains for explicitly demo-scoped flows only.
 * isLiveMap: false — no map rendered from this data.
 */
type DshSmartTrackingSnapshot = {
  source: 'captain_heartbeat_demo' | 'runtime_unbound';
  cadenceMinutes: 3;
  isLiveMap: false;
  lastUpdateMinutesAgo: number;
  etaMinutes: number | null;
  proximityState: DshSmartProximityState;
  bellRang: boolean;
};

// ─── Captain heartbeat and bell event ─────────────────────────────────────────

type DshCaptainHeartbeatSnapshot = {
  orderId: string;
  captainId: string;
  timestamp: string;
  etaMinutes: number | null;
  proximityState: DshSmartProximityState;
};

/** Emitted when the captain presses the doorbell. Consumed by client SmartTrackingCard. */
export type DshCaptainBellEvent = {
  orderId: string;
  captainId: string;
  timestamp: string;
  proximityState: DshSmartProximityState;
};

// ─── Operations types ──────────────────────────────────────────────────────────

export type DshOperationsDecisionKind = 'approve' | 'reject' | 'request_edit';

type DshOperationsDecisionPayload = {
  orderId: string;
  decision: DshOperationsDecisionKind;
  note?: string;
  /** Explicit lifecycle transition — approve → operations_approved, reject → cancelled, request_edit → confirmed (back to review). */
  nextLifecycleStatus: DshOrderLifecycleStatus;
};

type DshOperationsOrderDetail = {
  id: string;
  customerName: string;
  customerPhone: string;
  dropoffAddress: string;
  pickupAddress: string;
  storeName: string;
  paymentMethod: string;
  paymentStatus: string;
  cartItems: Array<{ title: string; qty: number; priceLabel: string }>;
  subtotalLabel: string;
  deliveryLabel: string;
  totalLabel: string;
  customerNote: string;
  customerInstructions: string;
  couponCode: string;
  eventLog: Array<{ status: string; actor: string; timestamp: string }>;
};

// ─── Partner preparation stage ─────────────────────────────────────────────────

export type DshPartnerPreparationStage = {
  id: string;
  title: string;
  subtitle: string;
  badgeLabel: string;
  lifecycleStatus: DshOrderLifecycleStatus;
  prerequisiteStatus?: DshOrderLifecycleStatus;
};

// ─── P0-02: Lifecycle state metadata types ────────────────────────────────────

/** Who owns the action/decision in this lifecycle state. */
export type DshOrderLifecycleActorOwner =
  | 'client'
  | 'partner'
  | 'captain'
  | 'field'
  | 'operations'
  | 'system'
  | 'wlt';

/**
 * WLT boundary marker for DSH lifecycle states.
 * Any state with a non-'none' value is read-only in DSH —
 * no financial mutation is permitted inside DSH for that state.
 */
export type DshOrderLifecycleWltImplication =
  | 'payment-read-only'
  | 'refund-read-only'
  | 'settlement-read-only'
  | 'none';

/** Which delivery mode(s) can enter this lifecycle state. */
export type DshOrderLifecycleDeliveryModeImpact =
  | 'bthwani_delivery'
  | 'partner_delivery'
  | 'pickup'
  | 'all'
  | 'none';

export type DshOrderLifecycleStateAction = {
  readonly id: string;
  readonly label: string;
  readonly routeHint?: string;
};

/**
 * Full metadata for a single DSH lifecycle state.
 * Used by CP operations, dispatch, support, and signal layer
 * to understand actor ownership, surface visibility, WLT boundary,
 * audit requirements, and allowed transitions.
 */
export type DshOrderLifecycleStateMetadata = {
  readonly stateId: DshOrderLifecycleStatus;
  readonly actorOwner: DshOrderLifecycleActorOwner;
  readonly visibleToSurfaces: ReadonlyArray<'app-client' | 'app-partner' | 'app-captain' | 'app-field' | 'control-panel'>;
  readonly clientLabel: string;
  readonly partnerLabel: string;
  readonly captainLabel: string;
  readonly fieldLabel: string;
  readonly controlPanelLabel: string;
  readonly primaryAction?: DshOrderLifecycleStateAction;
  readonly secondaryAction?: DshOrderLifecycleStateAction;
  readonly allowedNextStates: ReadonlyArray<DshOrderLifecycleStatus>;
  readonly forbiddenActions?: ReadonlyArray<string>;
  readonly notificationSignal?: string;
  readonly supportFallback?: string;
  readonly wltImplication: DshOrderLifecycleWltImplication;
  readonly auditRequired: boolean;
  readonly deliveryModeImpact: DshOrderLifecycleDeliveryModeImpact;
};

// ─── DSH_ORDER_JOURNEY_STEPS ───────────────────────────────────────────────────

const DSH_ORDER_JOURNEY_STEPS: DshOrderJourneyStage[] = [
  // Original 13 entries — unchanged
  { id: 'order_submitted',        title: 'تم تقديم الطلب',           detail: 'الطلب بانتظار مراجعة فريق العمليات.' },
  { id: 'operations_review',      title: 'مراجعة العمليات',           detail: 'يراجع فريق العمليات الطلب قبل التأكيد.' },
  { id: 'operations_approved',    title: 'اعتماد العمليات',           detail: 'تمت الموافقة على الطلب.' },
  { id: 'order_received',         title: 'استلم المتجر',             detail: 'استلم المتجر الطلب وبدأ التجهيز.' },
  { id: 'preparing',              title: 'قيد التجهيز',              detail: 'يجهّز المتجر الطلب.' },
  { id: 'ready_for_pickup',       title: 'جاهز للاستلام',            detail: 'الطلب جاهز، الكابتن في الطريق.' },
  { id: 'captain_assigned',       title: 'تم تعيين الكابتن',         detail: 'كابتن مكلّف وهو في طريقه للاستلام.' },
  { id: 'picked_up',              title: 'استلم الكابتن الطلب',      detail: 'الطلب مع الكابتن متجهًا نحوك.' },
  { id: 'enroute_to_customer',    title: 'في الطريق إليك',           detail: 'الطلب في الطريق. تحديث كل 3 دقائق بدون خريطة حية.' },
  { id: 'near_customer',          title: 'الطلب قريب منك',           detail: 'الكابتن على مقربة من موقعك.' },
  { id: 'at_door',                title: 'الكابتن عند بابك',         detail: 'وصل الكابتن إلى موقع التسليم.' },
  { id: 'bell_rang',              title: 'تم قرع الجرس',             detail: 'أُرسل إشعار الوصول. استعد لاستلام طلبك.' },
  { id: 'delivered',              title: 'تم التسليم',               detail: 'استلمت طلبك. شكرًا لاستخدام بثواني.' },
  // P0-02 additions
  { id: 'payment_pending',        title: 'جارٍ معالجة الدفع',        detail: 'بانتظار تأكيد الدفع من WLT. لا تغلق هذه الصفحة.' },
  { id: 'payment_failed',         title: 'فشل الدفع',                detail: 'لم يتم قبول الدفع. يرجى مراجعة وسيلة الدفع والمحاولة مجددًا.' },
  { id: 'order_failed',           title: 'فشل إنشاء الطلب',          detail: 'تم قبول الدفع لكن تعذّر إنشاء الطلب. سيتم المراجعة تلقائيًا.' },
  { id: 'partner_rejected',       title: 'رفض المتجر الطلب',         detail: 'اعتذر المتجر عن تنفيذ الطلب. سيتم إعادة توجيهك.' },
  { id: 'exception',              title: 'استثناء تشغيلي',           detail: 'واجه الطلب مشكلة. فريق الدعم على علم وسيتابع.' },
  { id: 'cancellation_requested', title: 'طلب إلغاء',                detail: 'جارٍ مراجعة طلب الإلغاء.' },
  { id: 'cancelled',              title: 'تم الإلغاء',               detail: 'تم إلغاء الطلب.' },
  { id: 'refund_pending',         title: 'بانتظار الاسترداد',         detail: 'جارٍ معالجة استرداد المبلغ عبر WLT. هذا العرض للقراءة فقط.' },
  { id: 'post_delivery',          title: 'ما بعد التسليم',            detail: 'يمكنك الآن تقييم طلبك.' },
];

// ─── Mapping functions ─────────────────────────────────────────────────────────

function mapLifecycleToJourneyStage(status: DshOrderLifecycleStatus): DshOrderJourneyStageId {
  switch (status) {
    // ── Original mappings ──────────────────────────────────────────────────
    case 'quote':
    case 'created':                return 'order_submitted';
    case 'confirmed':              return 'operations_review';
    case 'operations_approved':    return 'operations_approved';
    case 'order_received':
    case 'partner_accepted':       return 'order_received';
    case 'preparing':              return 'preparing';
    case 'ready_for_pickup':       return 'ready_for_pickup';
    case 'captain_assigned':
    case 'enroute_to_pickup':
    case 'arrived_at_pickup':      return 'captain_assigned';
    case 'picked_up':              return 'picked_up';
    case 'enroute_to_dropoff':     return 'enroute_to_customer';
    case 'near_customer':          return 'near_customer';
    case 'at_door':                return 'at_door';
    case 'bell_rang':              return 'bell_rang';
    case 'arrived_at_dropoff':
    case 'delivered':              return 'delivered';
    case 'cancelled':              return 'cancelled';
    case 'failed':
    case 'returned':               return 'exception';
    case 'refunded':               return 'post_delivery';
    // ── P0-02: Pre-order and payment ──────────────────────────────────────
    case 'checkout_intent':
    case 'serviceability_quote':
    case 'order_draft':            return 'order_submitted';
    case 'awaiting_wlt_payment':   return 'payment_pending';
    case 'payment_failed':         return 'payment_failed';
    case 'payment_confirmed':
    case 'order_created_preview':  return 'order_submitted';
    case 'order_creation_failed':  return 'order_failed';
    // ── P0-02: Partner lifecycle ───────────────────────────────────────────
    case 'partner_intake':
    case 'partner_prepare':        return 'order_received';
    case 'partner_rejected':       return 'partner_rejected';
    case 'preparation_delayed':
    case 'item_unavailable':       return 'preparing';
    case 'partner_ready':          return 'ready_for_pickup';
    // ── P0-02: Captain lifecycle ───────────────────────────────────────────
    case 'captain_assignment':
    case 'captain_accept':         return 'captain_assigned';
    case 'captain_decline':
    case 'captain_unavailable':
    case 'reassignment_required':  return 'exception';
    // ── P0-02: Pickup/delivery exceptions ─────────────────────────────────
    case 'pickup_failed':
    case 'handoff_mismatch':
    case 'delivery_failed':        return 'exception';
    case 'out_for_delivery':       return 'enroute_to_customer';
    case 'proof_of_delivery':
    case 'rating_pending':         return 'post_delivery';
    // ── P0-02: Cancellation ───────────────────────────────────────────────
    case 'cancellation_requested': return 'cancellation_requested';
    case 'cancellation_approved':  return 'cancelled';
    // ── P0-02: WLT refund bridge ──────────────────────────────────────────
    case 'refund_pending_wlt':
    case 'refund_rejected_wlt':    return 'refund_pending';
    case 'refund_completed_wlt':   return 'post_delivery';
    // ── P0-02: Support and audit ──────────────────────────────────────────
    case 'support_exception':
    case 'audit_required':
    case 'audit_closed':           return 'exception';
    default:                       return 'order_submitted';
  }
}

/**
 * Maps an operations decision to the resulting lifecycle status.
 * - approve → operations_approved
 * - reject → cancelled
 * - request_edit → confirmed (order returns to ops review queue pending customer correction)
 */
function mapOperationsDecisionToLifecycle(decision: DshOperationsDecisionKind): DshOrderLifecycleStatus {
  switch (decision) {
    case 'approve':       return 'operations_approved';
    case 'reject':        return 'cancelled';
    case 'request_edit':  return 'confirmed';
  }
}

// ─── P0-02: DSH_ORDER_LIFECYCLE_STATES registry ───────────────────────────────
//
// Full metadata for every lifecycle state. Actor ownership, surface visibility,
// Arabic labels for all 5 surfaces, WLT boundary, audit flag, delivery mode impact,
// and allowed next states for flow validation.
//
// WLT boundary: states with wltImplication !== 'none' are read-only in DSH.
// DSH never mutates payment/refund/settlement — WLT is the only financial authority.

export const DSH_ORDER_LIFECYCLE_STATES: ReadonlyArray<DshOrderLifecycleStateMetadata> = [
  // ── Pre-order ─────────────────────────────────────────────────────────────
  {
    stateId: 'checkout_intent',
    actorOwner: 'client',
    visibleToSurfaces: ['app-client'],
    clientLabel: 'إدخال بيانات الطلب',
    partnerLabel: '—',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'نية الشراء',
    allowedNextStates: ['serviceability_quote', 'order_draft', 'cancelled'],
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'all',
  },
  {
    stateId: 'serviceability_quote',
    actorOwner: 'system',
    visibleToSurfaces: ['app-client'],
    clientLabel: 'التحقق من الخدمة',
    partnerLabel: '—',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'فحص التغطية',
    allowedNextStates: ['awaiting_wlt_payment', 'cancelled'],
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'all',
  },
  {
    stateId: 'awaiting_wlt_payment',
    actorOwner: 'wlt',
    visibleToSurfaces: ['app-client', 'control-panel'],
    clientLabel: 'جارٍ معالجة الدفع',
    partnerLabel: '—',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'انتظار تأكيد WLT',
    allowedNextStates: ['payment_confirmed', 'payment_failed'],
    forbiddenActions: ['mutate-payment', 'cancel-payment-from-dsh'],
    notificationSignal: 'payment_processing',
    wltImplication: 'payment-read-only',
    auditRequired: false,
    deliveryModeImpact: 'all',
  },
  {
    stateId: 'payment_failed',
    actorOwner: 'wlt',
    visibleToSurfaces: ['app-client', 'control-panel'],
    clientLabel: 'فشل الدفع',
    partnerLabel: '—',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'فشل الدفع — WLT',
    primaryAction: { id: 'retry-payment', label: 'إعادة المحاولة', routeHint: 'dsh.client.checkout' },
    allowedNextStates: ['awaiting_wlt_payment', 'cancelled'],
    forbiddenActions: ['mutate-payment'],
    notificationSignal: 'payment_failed',
    supportFallback: 'open-support-payment',
    wltImplication: 'payment-read-only',
    auditRequired: false,
    deliveryModeImpact: 'all',
  },
  {
    stateId: 'payment_confirmed',
    actorOwner: 'wlt',
    visibleToSurfaces: ['app-client', 'control-panel'],
    clientLabel: 'تم تأكيد الدفع',
    partnerLabel: '—',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'تأكيد الدفع — WLT',
    allowedNextStates: ['order_draft', 'order_created_preview', 'order_creation_failed'],
    forbiddenActions: ['mutate-payment'],
    notificationSignal: 'payment_confirmed',
    wltImplication: 'payment-read-only',
    auditRequired: false,
    deliveryModeImpact: 'all',
  },
  {
    stateId: 'order_draft',
    actorOwner: 'system',
    visibleToSurfaces: ['app-client'],
    clientLabel: 'إنشاء الطلب',
    partnerLabel: '—',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'مسودة الطلب',
    allowedNextStates: ['order_created_preview', 'order_creation_failed'],
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'all',
  },
  {
    stateId: 'order_creation_failed',
    actorOwner: 'system',
    visibleToSurfaces: ['app-client', 'control-panel'],
    clientLabel: 'تعذّر إنشاء الطلب',
    partnerLabel: '—',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'فشل إنشاء الطلب',
    primaryAction: { id: 'contact-support', label: 'تواصل مع الدعم', routeHint: 'dsh.client.support' },
    allowedNextStates: ['support_exception', 'refund_pending_wlt'],
    supportFallback: 'open-support-order-failed',
    wltImplication: 'refund-read-only',
    auditRequired: true,
    deliveryModeImpact: 'all',
  },
  {
    stateId: 'order_created_preview',
    actorOwner: 'system',
    visibleToSurfaces: ['app-client'],
    clientLabel: 'تم تأكيد الطلب',
    partnerLabel: '—',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'طلب جديد للمراجعة',
    allowedNextStates: ['confirmed'],
    notificationSignal: 'order_created',
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'all',
  },
  // ── Original pre-partner states ───────────────────────────────────────────
  {
    stateId: 'quote',
    actorOwner: 'system',
    visibleToSurfaces: ['app-client'],
    clientLabel: 'عرض السعر',
    partnerLabel: '—',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'مرحلة التسعير',
    allowedNextStates: ['created', 'cancelled'],
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'all',
  },
  {
    stateId: 'created',
    actorOwner: 'client',
    visibleToSurfaces: ['app-client', 'control-panel'],
    clientLabel: 'تم تقديم الطلب',
    partnerLabel: '—',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'طلب جديد',
    allowedNextStates: ['confirmed', 'cancelled'],
    notificationSignal: 'order_created',
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'all',
  },
  {
    stateId: 'confirmed',
    actorOwner: 'operations',
    visibleToSurfaces: ['app-client', 'control-panel'],
    clientLabel: 'قيد المراجعة',
    partnerLabel: '—',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'بانتظار اعتماد العمليات',
    allowedNextStates: ['operations_approved', 'cancelled'],
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'all',
  },
  {
    stateId: 'operations_approved',
    actorOwner: 'operations',
    visibleToSurfaces: ['app-client', 'app-partner', 'control-panel'],
    clientLabel: 'تمت الموافقة',
    partnerLabel: 'طلب جديد',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'معتمد — ينتظر المتجر',
    allowedNextStates: ['order_received', 'partner_intake', 'partner_accepted', 'cancelled'],
    notificationSignal: 'partner_submitted',
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'all',
  },
  // ── Partner lifecycle ──────────────────────────────────────────────────────
  {
    stateId: 'partner_intake',
    actorOwner: 'partner',
    visibleToSurfaces: ['app-partner', 'control-panel'],
    clientLabel: 'يستلم المتجر',
    partnerLabel: 'طلب وارد',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'استلام المتجر',
    allowedNextStates: ['partner_accepted', 'partner_rejected'],
    notificationSignal: 'order_created',
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'all',
  },
  {
    stateId: 'order_received',
    actorOwner: 'partner',
    visibleToSurfaces: ['app-client', 'app-partner', 'control-panel'],
    clientLabel: 'استلم المتجر طلبك',
    partnerLabel: 'تم استلام الطلب',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'استلام المتجر',
    allowedNextStates: ['partner_accepted', 'preparing', 'partner_prepare'],
    notificationSignal: 'partner_accepted',
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'all',
  },
  {
    stateId: 'partner_accepted',
    actorOwner: 'partner',
    visibleToSurfaces: ['app-client', 'app-partner', 'control-panel'],
    clientLabel: 'قبل المتجر طلبك',
    partnerLabel: 'قبلت الطلب',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'قبول المتجر',
    allowedNextStates: ['preparing', 'partner_prepare'],
    notificationSignal: 'partner_accepted',
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'all',
  },
  {
    stateId: 'partner_rejected',
    actorOwner: 'partner',
    visibleToSurfaces: ['app-client', 'app-partner', 'control-panel'],
    clientLabel: 'اعتذر المتجر',
    partnerLabel: 'رفضت الطلب',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'رفض المتجر',
    primaryAction: { id: 'reassign-partner', label: 'إعادة التوجيه', routeHint: 'dsh.cp.operations.dispatch' },
    allowedNextStates: ['support_exception', 'cancellation_requested', 'operations_approved'],
    notificationSignal: 'partner_rejected',
    supportFallback: 'open-support-partner-rejected',
    wltImplication: 'none',
    auditRequired: true,
    deliveryModeImpact: 'all',
  },
  {
    stateId: 'partner_prepare',
    actorOwner: 'partner',
    visibleToSurfaces: ['app-client', 'app-partner', 'control-panel'],
    clientLabel: 'قيد التجهيز',
    partnerLabel: 'جاري التحضير',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'تجهيز المتجر',
    allowedNextStates: ['preparing', 'preparation_delayed', 'item_unavailable', 'partner_ready'],
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'all',
  },
  {
    stateId: 'preparing',
    actorOwner: 'partner',
    visibleToSurfaces: ['app-client', 'app-partner', 'control-panel'],
    clientLabel: 'يُجهَّز طلبك',
    partnerLabel: 'جارٍ التجهيز',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'تجهيز',
    allowedNextStates: ['ready_for_pickup', 'partner_ready', 'preparation_delayed', 'item_unavailable'],
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'all',
  },
  {
    stateId: 'preparation_delayed',
    actorOwner: 'partner',
    visibleToSurfaces: ['app-client', 'app-partner', 'control-panel'],
    clientLabel: 'تأخر التجهيز',
    partnerLabel: 'تأخر التجهيز',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'تجهيز متأخر — SLA',
    primaryAction: { id: 'contact-partner', label: 'تواصل مع المتجر', routeHint: 'dsh.cp.support' },
    allowedNextStates: ['ready_for_pickup', 'partner_ready', 'support_exception'],
    notificationSignal: 'sla_breach',
    supportFallback: 'open-support-preparation-delayed',
    wltImplication: 'none',
    auditRequired: true,
    deliveryModeImpact: 'all',
  },
  {
    stateId: 'item_unavailable',
    actorOwner: 'partner',
    visibleToSurfaces: ['app-client', 'app-partner', 'control-panel'],
    clientLabel: 'صنف غير متوفر',
    partnerLabel: 'صنف غير متوفر',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'صنف مفقود',
    primaryAction: { id: 'contact-client', label: 'إبلاغ العميل', routeHint: 'dsh.cp.support' },
    allowedNextStates: ['support_exception', 'cancellation_requested', 'preparing'],
    supportFallback: 'open-support-item-unavailable',
    wltImplication: 'none',
    auditRequired: true,
    deliveryModeImpact: 'all',
  },
  {
    stateId: 'partner_ready',
    actorOwner: 'partner',
    visibleToSurfaces: ['app-client', 'app-partner', 'app-captain', 'control-panel'],
    clientLabel: 'الطلب جاهز',
    partnerLabel: 'الطلب جاهز للاستلام',
    captainLabel: 'طلب جاهز للاستلام',
    fieldLabel: '—',
    controlPanelLabel: 'جاهز — ينتظر كابتن',
    allowedNextStates: ['ready_for_pickup', 'captain_assignment'],
    notificationSignal: 'partner_accepted',
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'bthwani_delivery',
  },
  {
    stateId: 'ready_for_pickup',
    actorOwner: 'system',
    visibleToSurfaces: ['app-client', 'app-partner', 'app-captain', 'control-panel'],
    clientLabel: 'الطلب جاهز',
    partnerLabel: 'جاهز للاستلام',
    captainLabel: 'جاهز للاستلام',
    fieldLabel: '—',
    controlPanelLabel: 'جاهز للاستلام',
    allowedNextStates: ['captain_assignment', 'captain_assigned'],
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'bthwani_delivery',
  },
  // ── Captain lifecycle ──────────────────────────────────────────────────────
  {
    stateId: 'captain_assignment',
    actorOwner: 'system',
    visibleToSurfaces: ['app-captain', 'control-panel'],
    clientLabel: 'جارٍ تعيين كابتن',
    partnerLabel: 'بانتظار الكابتن',
    captainLabel: 'طلب عرض',
    fieldLabel: '—',
    controlPanelLabel: 'البحث عن كابتن',
    allowedNextStates: ['captain_assigned', 'captain_accept', 'captain_decline', 'captain_unavailable'],
    notificationSignal: 'captain_assigned',
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'bthwani_delivery',
  },
  {
    stateId: 'captain_accept',
    actorOwner: 'captain',
    visibleToSurfaces: ['app-captain', 'control-panel'],
    clientLabel: 'كابتن في الطريق',
    partnerLabel: 'الكابتن قادم',
    captainLabel: 'قبلت الطلب',
    fieldLabel: '—',
    controlPanelLabel: 'قبول الكابتن',
    allowedNextStates: ['captain_assigned', 'enroute_to_pickup'],
    notificationSignal: 'captain_assigned',
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'bthwani_delivery',
  },
  {
    stateId: 'captain_assigned',
    actorOwner: 'system',
    visibleToSurfaces: ['app-client', 'app-partner', 'app-captain', 'control-panel'],
    clientLabel: 'كابتن مكلّف',
    partnerLabel: 'كابتن في الطريق',
    captainLabel: 'مهمة نشطة',
    fieldLabel: '—',
    controlPanelLabel: 'كابتن مخصص',
    allowedNextStates: ['enroute_to_pickup', 'arrived_at_pickup', 'picked_up'],
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'bthwani_delivery',
  },
  {
    stateId: 'captain_decline',
    actorOwner: 'captain',
    visibleToSurfaces: ['app-captain', 'control-panel'],
    clientLabel: 'جارٍ إيجاد كابتن',
    partnerLabel: '—',
    captainLabel: 'رفضت العرض',
    fieldLabel: '—',
    controlPanelLabel: 'رفض الكابتن',
    allowedNextStates: ['captain_assignment', 'reassignment_required'],
    notificationSignal: 'captain_declined',
    wltImplication: 'none',
    auditRequired: true,
    deliveryModeImpact: 'bthwani_delivery',
  },
  {
    stateId: 'captain_unavailable',
    actorOwner: 'system',
    visibleToSurfaces: ['app-client', 'control-panel'],
    clientLabel: 'لا يوجد كابتن متاح',
    partnerLabel: '—',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'لا كابتن — انتهت المهلة',
    primaryAction: { id: 'expand-zone', label: 'توسيع نطاق البحث', routeHint: 'dsh.cp.operations.dispatch' },
    allowedNextStates: ['reassignment_required', 'support_exception', 'cancellation_requested'],
    notificationSignal: 'reassignment_required',
    supportFallback: 'open-support-no-captain',
    wltImplication: 'none',
    auditRequired: true,
    deliveryModeImpact: 'bthwani_delivery',
  },
  {
    stateId: 'reassignment_required',
    actorOwner: 'operations',
    visibleToSurfaces: ['app-client', 'control-panel'],
    clientLabel: 'إعادة تعيين كابتن',
    partnerLabel: 'انتظار كابتن جديد',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'إعادة التعيين مطلوبة',
    primaryAction: { id: 'reassign', label: 'إعادة التعيين', routeHint: 'dsh.cp.operations.dispatch' },
    allowedNextStates: ['captain_assignment', 'captain_assigned'],
    notificationSignal: 'reassignment_required',
    wltImplication: 'none',
    auditRequired: true,
    deliveryModeImpact: 'bthwani_delivery',
  },
  // ── Pickup and delivery ────────────────────────────────────────────────────
  {
    stateId: 'enroute_to_pickup',
    actorOwner: 'captain',
    visibleToSurfaces: ['app-client', 'app-captain', 'control-panel'],
    clientLabel: 'الكابتن في الطريق للمتجر',
    partnerLabel: 'الكابتن قادم',
    captainLabel: 'في الطريق للاستلام',
    fieldLabel: '—',
    controlPanelLabel: 'توجه للاستلام',
    allowedNextStates: ['arrived_at_pickup', 'pickup_failed'],
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'bthwani_delivery',
  },
  {
    stateId: 'arrived_at_pickup',
    actorOwner: 'captain',
    visibleToSurfaces: ['app-partner', 'app-captain', 'control-panel'],
    clientLabel: 'الكابتن وصل للمتجر',
    partnerLabel: 'الكابتن هنا',
    captainLabel: 'وصلت للمتجر',
    fieldLabel: '—',
    controlPanelLabel: 'وصول نقطة الاستلام',
    allowedNextStates: ['picked_up', 'pickup_failed', 'handoff_mismatch'],
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'bthwani_delivery',
  },
  {
    stateId: 'pickup_failed',
    actorOwner: 'captain',
    visibleToSurfaces: ['app-captain', 'control-panel'],
    clientLabel: 'مشكلة في الاستلام',
    partnerLabel: 'مشكلة في الاستلام',
    captainLabel: 'تعذّر الاستلام',
    fieldLabel: '—',
    controlPanelLabel: 'فشل الاستلام',
    primaryAction: { id: 'contact-support', label: 'إبلاغ الدعم', routeHint: 'dsh.cp.support' },
    allowedNextStates: ['support_exception', 'reassignment_required'],
    notificationSignal: 'ticket_escalated',
    supportFallback: 'open-support-pickup-failed',
    wltImplication: 'none',
    auditRequired: true,
    deliveryModeImpact: 'bthwani_delivery',
  },
  {
    stateId: 'handoff_mismatch',
    actorOwner: 'captain',
    visibleToSurfaces: ['app-captain', 'app-partner', 'control-panel'],
    clientLabel: 'مشكلة في الطلب',
    partnerLabel: 'خلاف في محتوى الطلب',
    captainLabel: 'خلاف في الاستلام',
    fieldLabel: '—',
    controlPanelLabel: 'عدم تطابق التسليم',
    primaryAction: { id: 'escalate', label: 'تصعيد للدعم', routeHint: 'dsh.cp.support' },
    allowedNextStates: ['support_exception', 'picked_up'],
    notificationSignal: 'ticket_escalated',
    supportFallback: 'open-support-handoff-mismatch',
    wltImplication: 'none',
    auditRequired: true,
    deliveryModeImpact: 'bthwani_delivery',
  },
  {
    stateId: 'picked_up',
    actorOwner: 'captain',
    visibleToSurfaces: ['app-client', 'app-captain', 'control-panel'],
    clientLabel: 'الكابتن استلم طلبك',
    partnerLabel: 'تم التسليم للكابتن',
    captainLabel: 'استلمت الطلب',
    fieldLabel: '—',
    controlPanelLabel: 'مستلم من المتجر',
    allowedNextStates: ['enroute_to_dropoff', 'out_for_delivery'],
    notificationSignal: 'picked_up',
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'bthwani_delivery',
  },
  {
    stateId: 'out_for_delivery',
    actorOwner: 'captain',
    visibleToSurfaces: ['app-client', 'app-captain', 'control-panel'],
    clientLabel: 'في الطريق إليك',
    partnerLabel: '—',
    captainLabel: 'في طريقي للتسليم',
    fieldLabel: '—',
    controlPanelLabel: 'خرج للتوصيل',
    allowedNextStates: ['near_customer', 'arrived_at_dropoff', 'delivery_failed'],
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'bthwani_delivery',
  },
  {
    stateId: 'enroute_to_dropoff',
    actorOwner: 'captain',
    visibleToSurfaces: ['app-client', 'app-captain', 'control-panel'],
    clientLabel: 'في الطريق إليك',
    partnerLabel: '—',
    captainLabel: 'في الطريق للتسليم',
    fieldLabel: '—',
    controlPanelLabel: 'توجه للتسليم',
    allowedNextStates: ['near_customer', 'arrived_at_dropoff', 'delivery_failed'],
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'bthwani_delivery',
  },
  {
    stateId: 'near_customer',
    actorOwner: 'captain',
    visibleToSurfaces: ['app-client', 'app-captain'],
    clientLabel: 'الكابتن قريب منك',
    partnerLabel: '—',
    captainLabel: 'اقتربت من العميل',
    fieldLabel: '—',
    controlPanelLabel: 'قريب من العميل',
    allowedNextStates: ['at_door', 'bell_rang'],
    notificationSignal: 'picked_up',
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'bthwani_delivery',
  },
  {
    stateId: 'at_door',
    actorOwner: 'captain',
    visibleToSurfaces: ['app-client', 'app-captain'],
    clientLabel: 'الكابتن عند بابك',
    partnerLabel: '—',
    captainLabel: 'أنا عند الباب',
    fieldLabel: '—',
    controlPanelLabel: 'عند الباب',
    allowedNextStates: ['bell_rang', 'delivered', 'delivery_failed'],
    notificationSignal: 'picked_up',
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'bthwani_delivery',
  },
  {
    stateId: 'bell_rang',
    actorOwner: 'captain',
    visibleToSurfaces: ['app-client', 'app-captain'],
    clientLabel: 'تم قرع الجرس',
    partnerLabel: '—',
    captainLabel: 'قرعت الجرس',
    fieldLabel: '—',
    controlPanelLabel: 'قُرع الجرس',
    allowedNextStates: ['delivered', 'delivery_failed'],
    notificationSignal: 'picked_up',
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'bthwani_delivery',
  },
  {
    stateId: 'delivery_failed',
    actorOwner: 'captain',
    visibleToSurfaces: ['app-client', 'app-captain', 'control-panel'],
    clientLabel: 'تعذّر التسليم',
    partnerLabel: '—',
    captainLabel: 'تعذّر التسليم',
    fieldLabel: '—',
    controlPanelLabel: 'فشل التسليم',
    primaryAction: { id: 'contact-support', label: 'تواصل مع الدعم', routeHint: 'dsh.cp.support' },
    allowedNextStates: ['support_exception', 'cancellation_requested'],
    notificationSignal: 'ticket_escalated',
    supportFallback: 'open-support-delivery-failed',
    wltImplication: 'none',
    auditRequired: true,
    deliveryModeImpact: 'bthwani_delivery',
  },
  {
    stateId: 'arrived_at_dropoff',
    actorOwner: 'captain',
    visibleToSurfaces: ['app-client', 'app-captain', 'control-panel'],
    clientLabel: 'الكابتن وصل إليك',
    partnerLabel: '—',
    captainLabel: 'وصلت للعميل',
    fieldLabel: '—',
    controlPanelLabel: 'وصول نقطة التسليم',
    allowedNextStates: ['delivered', 'proof_of_delivery', 'delivery_failed'],
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'bthwani_delivery',
  },
  {
    stateId: 'proof_of_delivery',
    actorOwner: 'captain',
    visibleToSurfaces: ['app-captain', 'control-panel'],
    clientLabel: 'جارٍ تأكيد التسليم',
    partnerLabel: '—',
    captainLabel: 'رفع إثبات التسليم',
    fieldLabel: '—',
    controlPanelLabel: 'إثبات التسليم',
    allowedNextStates: ['delivered'],
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'bthwani_delivery',
  },
  {
    stateId: 'delivered',
    actorOwner: 'system',
    visibleToSurfaces: ['app-client', 'app-captain', 'app-partner', 'control-panel'],
    clientLabel: 'تم التسليم',
    partnerLabel: 'اكتمل الطلب',
    captainLabel: 'اكتملت المهمة',
    fieldLabel: '—',
    controlPanelLabel: 'مُسلَّم',
    allowedNextStates: ['rating_pending'],
    notificationSignal: 'delivered',
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'all',
  },
  {
    stateId: 'rating_pending',
    actorOwner: 'client',
    visibleToSurfaces: ['app-client'],
    clientLabel: 'قيّم طلبك',
    partnerLabel: '—',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'بانتظار التقييم',
    primaryAction: { id: 'rate-order', label: 'تقييم الطلب', routeHint: 'dsh.client.rating' },
    allowedNextStates: ['returned'],
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'all',
  },
  // ── Cancellation ───────────────────────────────────────────────────────────
  {
    stateId: 'cancellation_requested',
    actorOwner: 'client',
    visibleToSurfaces: ['app-client', 'control-panel'],
    clientLabel: 'جارٍ مراجعة طلب الإلغاء',
    partnerLabel: 'طلب إلغاء',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'طلب إلغاء',
    primaryAction: { id: 'review-cancellation', label: 'مراجعة', routeHint: 'dsh.cp.operations' },
    allowedNextStates: ['cancellation_approved', 'cancelled'],
    wltImplication: 'none',
    auditRequired: true,
    deliveryModeImpact: 'all',
  },
  {
    stateId: 'cancellation_approved',
    actorOwner: 'operations',
    visibleToSurfaces: ['app-client', 'control-panel'],
    clientLabel: 'تم الإلغاء',
    partnerLabel: 'تم الإلغاء',
    captainLabel: 'تم الإلغاء',
    fieldLabel: '—',
    controlPanelLabel: 'إلغاء معتمد',
    allowedNextStates: ['cancelled', 'refund_pending_wlt'],
    wltImplication: 'none',
    auditRequired: true,
    deliveryModeImpact: 'all',
  },
  {
    stateId: 'cancelled',
    actorOwner: 'system',
    visibleToSurfaces: ['app-client', 'app-partner', 'app-captain', 'control-panel'],
    clientLabel: 'تم الإلغاء',
    partnerLabel: 'الطلب ملغى',
    captainLabel: 'الطلب ملغى',
    fieldLabel: '—',
    controlPanelLabel: 'ملغى',
    allowedNextStates: ['refund_pending_wlt'],
    notificationSignal: 'ticket_created',
    wltImplication: 'none',
    auditRequired: false,
    deliveryModeImpact: 'all',
  },
  // ── WLT refund bridge (DSH read-only) ────────────────────────────────────
  {
    stateId: 'refund_pending_wlt',
    actorOwner: 'wlt',
    visibleToSurfaces: ['app-client', 'control-panel'],
    clientLabel: 'جارٍ استرداد المبلغ',
    partnerLabel: '—',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'استرداد بانتظار WLT',
    allowedNextStates: ['refund_completed_wlt', 'refund_rejected_wlt'],
    forbiddenActions: ['mutate-refund', 'approve-refund-from-dsh', 'reject-refund-from-dsh'],
    notificationSignal: 'refund_pending_wlt',
    wltImplication: 'refund-read-only',
    auditRequired: true,
    deliveryModeImpact: 'all',
  },
  {
    stateId: 'refund_rejected_wlt',
    actorOwner: 'wlt',
    visibleToSurfaces: ['app-client', 'control-panel'],
    clientLabel: 'رُفض الاسترداد',
    partnerLabel: '—',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'استرداد مرفوض — WLT',
    primaryAction: { id: 'open-wlt', label: 'مراجعة WLT', routeHint: 'wlt.finance.refund' },
    allowedNextStates: ['support_exception'],
    forbiddenActions: ['mutate-refund', 'override-wlt-decision'],
    supportFallback: 'open-support-refund-rejected',
    wltImplication: 'refund-read-only',
    auditRequired: true,
    deliveryModeImpact: 'all',
  },
  {
    stateId: 'refund_completed_wlt',
    actorOwner: 'wlt',
    visibleToSurfaces: ['app-client', 'control-panel'],
    clientLabel: 'تم استرداد المبلغ',
    partnerLabel: '—',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'استرداد مكتمل — WLT',
    allowedNextStates: [],
    forbiddenActions: ['mutate-refund'],
    notificationSignal: 'refund_completed_wlt',
    wltImplication: 'refund-read-only',
    auditRequired: true,
    deliveryModeImpact: 'all',
  },
  // ── Legacy aliases (backward compat — keep in union and registry) ─────────
  {
    stateId: 'refunded',
    actorOwner: 'wlt',
    visibleToSurfaces: ['app-client', 'control-panel'],
    clientLabel: 'تم الاسترداد',
    partnerLabel: '—',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'مُسترَد (قديم)',
    allowedNextStates: [],
    forbiddenActions: ['mutate-refund'],
    wltImplication: 'refund-read-only',
    auditRequired: false,
    deliveryModeImpact: 'all',
  },
  {
    stateId: 'failed',
    actorOwner: 'system',
    visibleToSurfaces: ['app-client', 'control-panel'],
    clientLabel: 'فشل الطلب',
    partnerLabel: '—',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'فشل (قديم)',
    allowedNextStates: ['support_exception', 'refund_pending_wlt'],
    supportFallback: 'open-support-order-failed',
    wltImplication: 'none',
    auditRequired: true,
    deliveryModeImpact: 'all',
  },
  {
    stateId: 'returned',
    actorOwner: 'system',
    visibleToSurfaces: ['app-client', 'control-panel'],
    clientLabel: 'مُعاد',
    partnerLabel: '—',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'مُعاد',
    allowedNextStates: ['refund_pending_wlt'],
    wltImplication: 'refund-read-only',
    auditRequired: true,
    deliveryModeImpact: 'all',
  },
  // ── Support and audit ──────────────────────────────────────────────────────
  {
    stateId: 'support_exception',
    actorOwner: 'operations',
    visibleToSurfaces: ['app-client', 'control-panel'],
    clientLabel: 'جارٍ معالجة مشكلة',
    partnerLabel: 'استثناء دعم',
    captainLabel: 'استثناء دعم',
    fieldLabel: '—',
    controlPanelLabel: 'استثناء — تذكرة مفتوحة',
    primaryAction: { id: 'view-ticket', label: 'عرض التذكرة', routeHint: 'dsh.cp.support' },
    allowedNextStates: ['audit_required', 'cancellation_approved', 'refund_pending_wlt'],
    notificationSignal: 'ticket_escalated',
    wltImplication: 'none',
    auditRequired: true,
    deliveryModeImpact: 'all',
  },
  {
    stateId: 'audit_required',
    actorOwner: 'operations',
    visibleToSurfaces: ['control-panel'],
    clientLabel: '—',
    partnerLabel: '—',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'مراجعة تدقيق مطلوبة',
    primaryAction: { id: 'open-audit', label: 'فتح التدقيق', routeHint: 'dsh.cp.administration.audit' },
    allowedNextStates: ['audit_closed'],
    wltImplication: 'none',
    auditRequired: true,
    deliveryModeImpact: 'all',
  },
  {
    stateId: 'audit_closed',
    actorOwner: 'operations',
    visibleToSurfaces: ['control-panel'],
    clientLabel: '—',
    partnerLabel: '—',
    captainLabel: '—',
    fieldLabel: '—',
    controlPanelLabel: 'تدقيق مغلق',
    allowedNextStates: [],
    wltImplication: 'none',
    auditRequired: true,
    deliveryModeImpact: 'all',
  },
];

// ─── Lookup helper ─────────────────────────────────────────────────────────────

/**
 * Returns the full metadata entry for a lifecycle state, or undefined if not found.
 * Safe to call with any DshOrderLifecycleStatus value.
 */
export function getDshLifecycleStateMetadata(
  status: DshOrderLifecycleStatus,
): DshOrderLifecycleStateMetadata | undefined {
  return DSH_ORDER_LIFECYCLE_STATES.find((s) => s.stateId === status);
}

export type DshOrderInterventionFlowId =
  | 'manual-call-intake'
  | 'customer-360'
  | 'assisted-order-desk'
  | 'order-rescue';

export type DshOrderInterventionState = {
  readonly flowId: DshOrderInterventionFlowId;
  readonly ownerSection: 'support' | 'operations';
  readonly triggerStatuses: ReadonlyArray<DshOrderLifecycleStatus>;
  readonly allowedActions: ReadonlyArray<string>;
  readonly forbiddenActions: ReadonlyArray<string>;
  readonly wltBoundary: string;
  readonly nextAction: string;
};

export const DSH_ORDER_INTERVENTION_STATES: ReadonlyArray<DshOrderInterventionState> = [
  {
    flowId: 'manual-call-intake',
    ownerSection: 'support',
    triggerStatuses: ['payment_failed', 'order_creation_failed', 'support_exception'],
    allowedActions: ['تثبيت source = external_phone_manual', 'بدء التحقق من الهوية', 'فتح Customer 360'],
    forbiddenActions: ['كشف الحقول الحساسة قبل التحقق', 'بدء refund أو payout من داخل DSH'],
    wltBoundary: 'WLT يظهر فقط كمرجع للقراءة إذا احتاجت الحالة رؤية دفع أو استرداد.',
    nextAction: 'إذا اكتمل التحقق افتح Assisted Order أو Order Rescue حسب blocker الرئيسي.',
  },
  {
    flowId: 'customer-360',
    ownerSection: 'support',
    triggerStatuses: ['support_exception', 'cancellation_requested', 'refund_pending_wlt'],
    allowedActions: ['فتح الطلب أو التذكرة', 'تحويل إلى Assisted Order أو Order Rescue', 'عرض WLT reference'],
    forbiddenActions: ['إغلاق التذكرة خارج مالكها', 'فتح mutation مالي محلي'],
    wltBoundary: 'أي refund أو settlement يبقى مملوكًا لـ WLT مع عرض مرجعي فقط.',
    nextAction: 'استخدم Customer 360 لتجميع السياق ثم افتح workspace التدخل المناسب بدل نسخ التفاصيل.',
  },
  {
    flowId: 'assisted-order-desk',
    ownerSection: 'operations',
    triggerStatuses: ['item_unavailable', 'partner_rejected', 'support_exception'],
    allowedActions: ['إعادة بناء السلة', 'تثبيت البديل', 'إحالة الحالة إلى الشريك أو الدعم'],
    forbiddenActions: ['إرسال الطلب دون handoff واضح', 'إجراء مالي محلي'],
    wltBoundary: 'المدفوعات والاستردادات خارج Assisted Order وتبقى WLT-only.',
    nextAction: 'حوّل الحالة إلى Order Rescue إذا بقي blocker التشغيلي مفتوحًا بعد التثبيت الأولي.',
  },
  {
    flowId: 'order-rescue',
    ownerSection: 'operations',
    triggerStatuses: ['payment_failed', 'delivery_failed', 'refund_rejected_wlt', 'support_exception'],
    allowedActions: ['تحديد blocker واحد', 'فتح ticket أو WLT reference أو partner controls', 'تثبيت next-best-action'],
    forbiddenActions: ['دوران الحالة بين الأقسام دون قرار', 'duplicate intervention على أكثر من سطح', 'mutation مالي'],
    wltBoundary: 'إذا كانت المشكلة مالية فالرؤية مرجعية فقط والتنفيذ في WLT.',
    nextAction: 'أرسل الحالة إلى المالك النهائي مع audit note واضحة بدل إبقائها في صف rescue.',
  },
] as const;

function getDshOrderInterventionState(
  flowId: DshOrderInterventionFlowId,
): DshOrderInterventionState | undefined {
  return DSH_ORDER_INTERVENTION_STATES.find((entry) => entry.flowId === flowId);
}
