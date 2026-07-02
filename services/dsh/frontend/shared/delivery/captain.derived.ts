// Canonical location: dsh/frontend/shared/delivery/captain/captain.derived.ts
// Authority: dsh/frontend/shared/delivery/captain — captain derived selectors.
// No JSX. No ui-kit. No Tamagui. No React hooks — all computations are pure functions.

import {
  type CaptainAvailabilityStatus,
  type DshCaptainRoute,
  getCaptainAvailabilityMeta,
} from './captain.contract';
import { EMPTY_CAPTAIN_ORDER_SUMMARY } from './captain.cod';
import { resolveDshRuntimeOrderId } from './use-captain-order-runtime';
import { isCaptainPodRequiredForMode, isCaptainCodCollectorForMode } from '../identity-access/surface-visibility.policy';
import type { DshCaptainSurfaceState, DshCaptainSurfaceDerived } from './captain.surface.types';

const CAPTAIN_BOTTOM_NAV_ROUTES = new Set<DshCaptainRoute>([
  'home', 'map', 'inbox', 'account', 'account-finance', 'account-orders',
  'account-profile', 'account-docs', 'account-shifts', 'account-support',
  'support-directory', 'support-screen',
]);

export type CaptainDerivedCallbacks = {
  readonly toggleAvailability: () => void;
  readonly goToInbox: () => void;
  readonly resetInboxState: () => void;
  readonly toggleOrderExpanded: () => void;
};

export function buildCaptainBottomActiveId(
  route: DshCaptainRoute,
  isStoreCourierMode: boolean,
): string {
  if (isStoreCourierMode) {
    if (route === 'home') return 'my-orders';
    if (route === 'account') return 'profile';
    return '';
  }
  if (route === 'inbox' || route === 'account-orders') return 'orders';
  if (route === 'account-finance') return 'wallet';
  if (route === 'support-directory' || route === 'support-screen') return 'support';
  if (['account', 'account-profile', 'account-docs', 'account-shifts', 'account-support'].includes(route)) return 'profile';
  return '';
}

export function buildCaptainHomeTicker(
  state: Pick<DshCaptainSurfaceState, 'captainAvailabilityStatus' | 'inboxState' | 'activeOrderId'>,
  callbacks: CaptainDerivedCallbacks,
): DshCaptainSurfaceDerived['homeTicker'] {
  const isCaptainAvailable = state.captainAvailabilityStatus === 'available';
  const currentAvailabilityMeta = getCaptainAvailabilityMeta(state.captainAvailabilityStatus);
  const activeOrderDisplayId = state.activeOrderId ? resolveDshRuntimeOrderId(state.activeOrderId) : '';
  const activeSummary = EMPTY_CAPTAIN_ORDER_SUMMARY;

  if (!isCaptainAvailable) {
    return {
      statusLabel: currentAvailabilityMeta.label,
      message: currentAvailabilityMeta.description,
      onPress: callbacks.toggleAvailability,
      marquee: false,
    };
  }
  if (state.inboxState === 'loading') return { statusLabel: 'تحميل',  message: 'جارٍ تجهيز حركة الكابتن.', onPress: callbacks.goToInbox,       marquee: false };
  if (state.inboxState === 'error')   return { statusLabel: 'تنبيه',  message: 'تعذر تحميل الطلب النشط.', onPress: callbacks.resetInboxState,    marquee: false };
  if (state.inboxState === 'empty')   return { statusLabel: 'انتظار', message: 'لا يوجد طلب نشط الآن.',   onPress: callbacks.goToInbox,           marquee: false };
  if (state.inboxState === 'delivered') return { statusLabel: 'مغلق', message: 'تم تسليم الطلب الأخير.',  onPress: callbacks.goToInbox,           marquee: false };
  return {
    statusLabel: `#${activeOrderDisplayId}`,
    message: `${activeSummary.currentStageLabel} · ${activeSummary.etaLabel}`,
    onPress: callbacks.toggleOrderExpanded,
    marquee: false,
  };
}

export function buildCaptainDerived(
  state: DshCaptainSurfaceState,
  callbacks: CaptainDerivedCallbacks,
): DshCaptainSurfaceDerived {
  const isStoreCourierMode = state.captainAppMode === 'store_courier_mode';
  const isCaptainAvailable = state.captainAvailabilityStatus === 'available';
  const isGpsEnabled = state.gpsStatus !== 'disabled';
  const captainPodRequired = !isStoreCourierMode && isCaptainPodRequiredForMode('bthwani_delivery');
  const captainCollectsCod = !isStoreCourierMode && isCaptainCodCollectorForMode('bthwani_delivery');
  const currentAvailabilityMeta = getCaptainAvailabilityMeta(state.captainAvailabilityStatus);
  const activeOrderDisplayId = state.activeOrderId ? resolveDshRuntimeOrderId(state.activeOrderId) : '';
  const showBottomNav = isStoreCourierMode
    ? state.route === 'home' || state.route === 'account'
    : CAPTAIN_BOTTOM_NAV_ROUTES.has(state.route);
  const captainBottomActiveId = buildCaptainBottomActiveId(state.route, isStoreCourierMode);
  const homeTicker = buildCaptainHomeTicker(state, callbacks);

  return {
    isStoreCourierMode, isCaptainAvailable, isGpsEnabled, captainPodRequired, captainCollectsCod,
    showBottomNav, captainBottomActiveId, currentAvailabilityMeta, activeOrderDisplayId, homeTicker,
  };
}
