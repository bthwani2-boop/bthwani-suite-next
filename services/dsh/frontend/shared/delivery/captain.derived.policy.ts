export type CaptainPolicyRoute =
  | 'home'
  | 'account'
  | 'account-profile'
  | 'account-finance'
  | 'account-orders'
  | 'account-docs'
  | 'account-shifts'
  | 'account-support'
  | 'entry'
  | 'inbox'
  | 'detail'
  | 'orderchat'
  | 'bell'
  | 'support-directory'
  | 'support-screen'
  | 'store-pickup-context'
  | 'pickup-dropoff'
  | 'pod-submission'
  | 'map';

export type CaptainPolicyInboxState =
  | 'ready'
  | 'loading'
  | 'error'
  | 'empty'
  | 'delivered'
  | 'offer-accepting'
  | 'offer-accepted';

export type CaptainPolicyAssignment = {
  readonly orderId: string;
  readonly status: string;
  readonly delivery: { readonly status: string };
};

export type CaptainPolicyOrderSummary = {
  readonly orderId: string;
  readonly pickupLabel: string;
  readonly dropoffLabel: string;
  readonly etaLabel: string;
  readonly currentStageLabel: string;
  readonly nextActionLabel: string;
};

export type CaptainPolicyAvailabilityMeta = {
  readonly label: string;
  readonly description: string;
};

export type CaptainHomeTickerAction =
  | 'toggle-availability'
  | 'go-inbox'
  | 'reset-inbox'
  | 'toggle-order';

export type CaptainHomeTickerPolicy = {
  readonly statusLabel: string;
  readonly message: string;
  readonly action: CaptainHomeTickerAction;
  readonly marquee: false;
};

const EMPTY_CAPTAIN_ORDER_SUMMARY: CaptainPolicyOrderSummary = {
  orderId: '',
  pickupLabel: '',
  dropoffLabel: '',
  etaLabel: '',
  currentStageLabel: '',
  nextActionLabel: '',
};

const CAPTAIN_BOTTOM_NAV_ROUTES = new Set<CaptainPolicyRoute>([
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

export function buildCaptainOrderSummaryPolicy(
  assignment: CaptainPolicyAssignment | undefined,
  assignmentStatusLabels: Readonly<Record<string, string>>,
  deliveryStatusLabels: Readonly<Record<string, string>>,
): CaptainPolicyOrderSummary {
  if (!assignment) return EMPTY_CAPTAIN_ORDER_SUMMARY;

  const deliveryStatus = assignment.delivery.status;
  return {
    orderId: assignment.orderId,
    pickupLabel: `طلب #${assignment.orderId} — استلام من المتجر`,
    dropoffLabel: 'تسليم إلى العميل',
    etaLabel: assignmentStatusLabels[assignment.status] ?? assignment.status,
    currentStageLabel: deliveryStatusLabels[deliveryStatus] ?? deliveryStatus,
    nextActionLabel: deliveryStatus === 'picked_up' ? 'تأكيد التسليم' : 'تأكيد الاستلام',
  };
}

export function buildCaptainBottomActiveIdPolicy(
  route: CaptainPolicyRoute,
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
  state: {
    readonly captainAvailabilityStatus: string;
    readonly inboxState: CaptainPolicyInboxState;
    readonly activeOrderId: string;
  },
  availabilityMeta: CaptainPolicyAvailabilityMeta,
  activeSummary: CaptainPolicyOrderSummary,
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

  const activeOrderDisplayId = state.activeOrderId ? normalizeCaptainOrderId(state.activeOrderId) : '';
  return {
    statusLabel: activeOrderDisplayId ? `#${activeOrderDisplayId}` : 'جاهز',
    message: `${activeSummary.currentStageLabel} · ${activeSummary.etaLabel}`,
    action: 'toggle-order',
    marquee: false,
  };
}

export function buildCaptainPresentationPolicy(
  state: {
    readonly route: CaptainPolicyRoute;
    readonly captainAvailabilityStatus: string;
    readonly gpsStatus: string;
    readonly captainAppMode: string;
    readonly activeOrderId: string;
  },
  hasActiveAssignment: boolean,
) {
  const isStoreCourierMode = state.captainAppMode === 'store_courier_mode';
  const isCaptainAvailable = state.captainAvailabilityStatus === 'available';
  const isGpsEnabled = state.gpsStatus !== 'disabled';
  const captainPodRequired = hasActiveAssignment && !isStoreCourierMode;
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
    activeOrderDisplayId: state.activeOrderId ? normalizeCaptainOrderId(state.activeOrderId) : '',
  } as const;
}
