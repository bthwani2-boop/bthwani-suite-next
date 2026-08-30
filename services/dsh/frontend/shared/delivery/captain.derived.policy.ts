import type { CaptainAvailabilityMeta, DshCaptainRoute } from './captain.contract';
import type {
  CaptainDeliveryAction,
  CaptainHomeTickerAction,
  DshCaptainSurfaceState,
} from './captain.surface.types';
import type {
  DshAssignmentStatus,
  DshDeliveryStatus,
  DshDispatchAssignment,
} from '../dispatch/dispatch.types';
import type { DshCaptainOrderDetailSummary } from '../orders';
import { nextDeliveryStatus } from '../dispatch/delivery-status-flow.ts';

export type CaptainHomeTickerPolicy = {
  readonly statusLabel: string;
  readonly message: string;
  readonly action: CaptainHomeTickerAction;
  readonly marquee: false;
};

const EMPTY_CAPTAIN_ORDER_SUMMARY: DshCaptainOrderDetailSummary = {
  orderId: '',
  workItemLabel: 'المهمة',
  pickupLabel: '',
  dropoffLabel: '',
  etaLabel: '',
  currentStageLabel: '',
  nextActionLabel: '',
  deliveryActionId: 'none',
};

const CAPTAIN_BOTTOM_NAV_ROUTES = new Set<DshCaptainRoute>([
  'home',
  'entry',
  'map',
  'inbox',
  'account',
  'account-finance',
  'account-orders',
  'account-profile',
  'account-docs',
  'account-shifts',
  'account-support',
  'support-directory',
  'support-screen',
]);

export function normalizeCaptainOrderId(orderId: string): string {
  return orderId.trim();
}

export function resolveCaptainDeliveryAction(
  deliveryStatus: DshDeliveryStatus | undefined,
): CaptainDeliveryAction {
  const nextStatus = deliveryStatus ? nextDeliveryStatus(deliveryStatus) : null;
  if (nextStatus === 'driver_arrived_store') {
    return { id: 'arrive_store', label: 'تأكيد الوصول للمتجر', description: 'ثبّت الوصول بعد قراءة GPS المصدق قرب المتجر.', enabled: true };
  }
  if (nextStatus === 'picked_up') {
    return { id: 'pickup', label: 'تأكيد الاستلام', description: 'ثبّت الاستلام بعد اكتمال تأكيد عهدة المتجر.', enabled: true };
  }
  if (nextStatus === 'arrived_customer') {
    return { id: 'arrive_customer', label: 'تأكيد الوصول للعميل', description: 'ثبّت الوصول بعد قراءة GPS المصدق قرب عنوان العميل.', enabled: true };
  }
  if (deliveryStatus === 'arrived_customer') {
    return { id: 'open_pod', label: 'فتح إثبات التسليم', description: 'أكمل إثبات التسليم بعد تثبيت الوصول للعميل.', enabled: true };
  }
  if (deliveryStatus === 'delivered') {
    return { id: 'none', label: 'تم إغلاق المهمة', description: 'لا توجد حركة تشغيلية أخرى لهذه المهمة.', enabled: false };
  }
  if (deliveryStatus === 'cancelled' || deliveryStatus === 'returned_to_store') {
    return { id: 'none', label: 'أغلقت المهمة', description: 'لا يمكن تنفيذ حركة تسليم على مهمة مغلقة.', enabled: false };
  }
  return { id: 'none', label: 'بانتظار قرار تشغيلي', description: 'لا يوجد إجراء Captain قانوني متاح من الحالة الحالية.', enabled: false };
}

export function buildCaptainOrderSummaryPolicy(
  assignment: DshDispatchAssignment | undefined,
  assignmentStatusLabels: Readonly<Record<DshAssignmentStatus, string>>,
  deliveryStatusLabels: Readonly<Record<DshDeliveryStatus, string>>,
): DshCaptainOrderDetailSummary {
  if (!assignment) return EMPTY_CAPTAIN_ORDER_SUMMARY;

  const deliveryStatus = assignment.delivery.status;
  const action = resolveCaptainDeliveryAction(deliveryStatus);
  const isSpecialRequest = Boolean(assignment.specialRequestId && !assignment.orderId);
  const workItemId = assignment.orderId || assignment.specialRequestId || '';
  const workItemLabel = assignment.requestType === 'SHEIN_ASSISTED_PURCHASE'
    ? 'SHEIN'
    : assignment.requestType === 'AWNAK_ERRAND'
      ? 'عونك'
      : 'المهمة الخاصة';
  return {
    orderId: workItemId,
    workItemLabel: isSpecialRequest ? workItemLabel : 'الطلب',
    pickupLabel: isSpecialRequest
      ? `${workItemLabel} #${workItemId} — استلام من نقطة التنفيذ`
      : `طلب #${assignment.orderId} — استلام من المتجر`,
    dropoffLabel: isSpecialRequest ? 'إكمال المهمة الخاصة مع العميل' : 'تسليم إلى العميل',
    etaLabel: assignmentStatusLabels[assignment.status] ?? assignment.status,
    currentStageLabel: deliveryStatusLabels[deliveryStatus] ?? deliveryStatus,
    nextActionLabel: action.label,
    deliveryActionId: action.id,
  };
}

export function buildCaptainBottomActiveIdPolicy(
  route: DshCaptainRoute,
  isStoreCourierMode: boolean,
): string {
  if (isStoreCourierMode) {
    if (route === 'home' || route === 'entry') return 'my-orders';
    if (route === 'account') return 'profile';
    return '';
  }
  if (route === 'inbox' || route === 'account-orders') return 'orders';
  if (route === 'account-finance') return 'wallet';
  if (route === 'support-directory' || route === 'support-screen') return 'support';
  if (['account', 'account-profile', 'account-docs', 'account-shifts', 'account-support'].includes(route)) {
    return 'profile';
  }
  return '';
}

export function buildCaptainHomeTickerPolicy(
  state: Pick<DshCaptainSurfaceState, 'captainAvailabilityStatus' | 'inboxState' | 'activeOrderId'>
    & Partial<Pick<DshCaptainSurfaceState, 'activeWorkItemId'>>,
  availabilityMeta: Pick<CaptainAvailabilityMeta, 'label' | 'description'>,
  activeSummary: DshCaptainOrderDetailSummary,
): CaptainHomeTickerPolicy {
  const isCaptainAvailable = state.captainAvailabilityStatus === 'available';
  if (!isCaptainAvailable) {
    return {
      statusLabel: availabilityMeta.label,
      message: availabilityMeta.description,
      action: 'toggle-availability',
      marquee: false,
    };
  }

  if (state.inboxState === 'loading') {
    return { statusLabel: 'تحميل', message: 'جارٍ تجهيز حركة الكابتن.', action: 'go-inbox', marquee: false };
  }
  if (state.inboxState === 'error') {
    return { statusLabel: 'تنبيه', message: 'تعذر تحميل الطلب النشط.', action: 'reset-inbox', marquee: false };
  }
  if (state.inboxState === 'empty') {
    return { statusLabel: 'انتظار', message: 'لا يوجد طلب نشط الآن.', action: 'go-inbox', marquee: false };
  }
  if (state.inboxState === 'delivered') {
    return { statusLabel: 'مغلق', message: 'تم تسليم الطلب الأخير.', action: 'go-inbox', marquee: false };
  }

  const activeOrderDisplayId = state.activeWorkItemId
    ? normalizeCaptainOrderId(state.activeWorkItemId)
    : state.activeOrderId
      ? normalizeCaptainOrderId(state.activeOrderId)
      : '';
  return {
    statusLabel: activeOrderDisplayId ? `#${activeOrderDisplayId}` : 'جاهز',
    message: `${activeSummary.currentStageLabel} · ${activeSummary.etaLabel}`,
    action: 'toggle-order',
    marquee: false,
  };
}

export function buildCaptainPresentationPolicy(
  state: Pick<
    DshCaptainSurfaceState,
    'route' | 'captainAvailabilityStatus' | 'gpsStatus' | 'captainAppMode' | 'activeOrderId' | 'activeDeliveryStatus'
  > & Partial<Pick<DshCaptainSurfaceState, 'activeWorkItemId'>>,
  hasActiveAssignment: boolean,
) {
  const isStoreCourierMode = state.captainAppMode === 'store_courier_mode';
  const isCaptainAvailable = state.captainAvailabilityStatus === 'available';
  const isGpsEnabled = state.gpsStatus !== 'disabled';
  const captainPodRequired = hasActiveAssignment && state.activeDeliveryStatus === 'arrived_customer';
  const showBottomNav = isStoreCourierMode
    ? state.route === 'home' || state.route === 'entry' || state.route === 'account'
    : CAPTAIN_BOTTOM_NAV_ROUTES.has(state.route);

  return {
    isStoreCourierMode,
    isCaptainAvailable,
    isGpsEnabled,
    captainPodRequired,
    showBottomNav,
    captainBottomActiveId: buildCaptainBottomActiveIdPolicy(state.route, isStoreCourierMode),
    activeOrderDisplayId: state.activeWorkItemId
      ? normalizeCaptainOrderId(state.activeWorkItemId)
      : state.activeOrderId
        ? normalizeCaptainOrderId(state.activeOrderId)
        : '',
  } as const;
}
