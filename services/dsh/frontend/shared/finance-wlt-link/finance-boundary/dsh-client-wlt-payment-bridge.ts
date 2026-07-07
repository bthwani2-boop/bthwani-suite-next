/**
 * DSH Client ↔ WLT Payment Bridge
 * LIVE — WLT backend binding is active (J-003).
 *
 * Maps client-side payment states to WLT intents for display purposes.
 * Defines the exact boundary between what DSH shows and what WLT owns.
 *
 * Rules:
 * - DSH never writes to WLT ledger, wallet, or payment systems.
 * - DSH never computes fees, commissions, refund amounts, or balances.
 * - DSH displays WLT-provided values in read-only format only.
 */

import type { DshClientState } from '../../orders/orders.client-state';
import type { DshFulfillmentDeliveryMode } from '../../delivery';
import type { DshSignalEventKind } from '../../marketing/dsh-signal-layer.model';

export type DshWltIntentKind =
  | 'payment_initiation'
  | 'payment_hold'
  | 'payment_capture'
  | 'payment_release'
  | 'refund_initiation'
  | 'refund_completion'
  | 'wallet_credit'
  | 'wallet_debit'
  | 'no_wlt_action';

export type DshWltIntentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'not_applicable';

export type DshClientWltIntentEntry = {
  readonly clientState: DshClientState;
  readonly intentKind: DshWltIntentKind;
  readonly label: string;
  readonly statusHint: DshWltIntentStatus;
  readonly clientUiHint: string;
  readonly walletBalanceVisible: boolean;
  readonly refundEligibilityVisible: boolean;
  readonly completionSignal?: DshSignalEventKind;
  readonly dshReadOnly: true;
  readonly mutationForbidden: true;
  readonly contractState: 'LIVE';
};

export const DSH_CLIENT_WLT_INTENT_MAP: readonly DshClientWltIntentEntry[] = [
  { clientState: 'quote', intentKind: 'no_wlt_action', label: 'لا إجراء WLT — مرحلة التسعير', statusHint: 'not_applicable', clientUiHint: 'يُعرض السعر التقديري فقط', walletBalanceVisible: false, refundEligibilityVisible: false, dshReadOnly: true, mutationForbidden: true, contractState: 'LIVE' },
  { clientState: 'serviceability', intentKind: 'no_wlt_action', label: 'لا إجراء WLT — فحص التغطية', statusHint: 'not_applicable', clientUiHint: 'فحص قابلية التوصيل جارٍ', walletBalanceVisible: false, refundEligibilityVisible: false, dshReadOnly: true, mutationForbidden: true, contractState: 'LIVE' },
  { clientState: 'store_open', intentKind: 'no_wlt_action', label: 'لا إجراء WLT — المتجر مفتوح', statusHint: 'not_applicable', clientUiHint: '', walletBalanceVisible: false, refundEligibilityVisible: false, dshReadOnly: true, mutationForbidden: true, contractState: 'LIVE' },
  { clientState: 'store_closed', intentKind: 'no_wlt_action', label: 'لا إجراء WLT — المتجر مغلق', statusHint: 'not_applicable', clientUiHint: '', walletBalanceVisible: false, refundEligibilityVisible: false, dshReadOnly: true, mutationForbidden: true, contractState: 'LIVE' },
  { clientState: 'area_unserviceable', intentKind: 'no_wlt_action', label: 'لا إجراء WLT — خارج التغطية', statusHint: 'not_applicable', clientUiHint: '', walletBalanceVisible: false, refundEligibilityVisible: false, dshReadOnly: true, mutationForbidden: true, contractState: 'LIVE' },
  { clientState: 'item_unavailable', intentKind: 'no_wlt_action', label: 'لا إجراء WLT — عنصر غير متاح', statusHint: 'not_applicable', clientUiHint: '', walletBalanceVisible: false, refundEligibilityVisible: false, dshReadOnly: true, mutationForbidden: true, contractState: 'LIVE' },
  { clientState: 'cart_empty', intentKind: 'no_wlt_action', label: 'لا إجراء WLT — السلة فارغة', statusHint: 'not_applicable', clientUiHint: '', walletBalanceVisible: false, refundEligibilityVisible: false, dshReadOnly: true, mutationForbidden: true, contractState: 'LIVE' },
  { clientState: 'cart_ready', intentKind: 'no_wlt_action', label: 'لا إجراء WLT — السلة جاهزة', statusHint: 'not_applicable', clientUiHint: '', walletBalanceVisible: false, refundEligibilityVisible: false, dshReadOnly: true, mutationForbidden: true, contractState: 'LIVE' },
  { clientState: 'checkout_ready', intentKind: 'payment_initiation', label: 'WLT يُهيئ الدفع — اختيار الوسيلة', statusHint: 'pending', clientUiHint: 'اختر وسيلة الدفع', walletBalanceVisible: true, refundEligibilityVisible: false, dshReadOnly: true, mutationForbidden: true, contractState: 'LIVE' },
  { clientState: 'payment_pending', intentKind: 'payment_hold', label: 'WLT يحتجز المبلغ — جارٍ التحقق', statusHint: 'processing', clientUiHint: 'جارٍ تأكيد الدفع...', walletBalanceVisible: true, refundEligibilityVisible: false, dshReadOnly: true, mutationForbidden: true, contractState: 'LIVE' },
  { clientState: 'payment_failed', intentKind: 'payment_release', label: 'WLT أطلق الاحتجاز — الدفع فشل', statusHint: 'failed', clientUiHint: 'فشل الدفع — أعد المحاولة', walletBalanceVisible: true, refundEligibilityVisible: false, completionSignal: 'payment_failed', dshReadOnly: true, mutationForbidden: true, contractState: 'LIVE' },
  { clientState: 'order_created', intentKind: 'payment_capture', label: 'WLT يستكمل الخصم — الطلب أُنشئ', statusHint: 'processing', clientUiHint: 'تم الطلب — جارٍ التأكيد', walletBalanceVisible: false, refundEligibilityVisible: false, dshReadOnly: true, mutationForbidden: true, contractState: 'LIVE' },
  { clientState: 'order_confirmed', intentKind: 'no_wlt_action', label: 'WLT أكّد الخصم — الطلب مؤكد', statusHint: 'completed', clientUiHint: 'الطلب مؤكد', walletBalanceVisible: false, refundEligibilityVisible: false, dshReadOnly: true, mutationForbidden: true, contractState: 'LIVE' },
  { clientState: 'tracking_active', intentKind: 'no_wlt_action', label: 'لا إجراء WLT — الطلب في التوصيل', statusHint: 'not_applicable', clientUiHint: 'تتبع طلبك', walletBalanceVisible: false, refundEligibilityVisible: false, dshReadOnly: true, mutationForbidden: true, contractState: 'LIVE' },
  { clientState: 'delivered', intentKind: 'no_wlt_action', label: 'WLT يُغلق المعاملة — تم التسليم', statusHint: 'completed', clientUiHint: 'تم تسليم طلبك', walletBalanceVisible: false, refundEligibilityVisible: false, dshReadOnly: true, mutationForbidden: true, contractState: 'LIVE' },
  { clientState: 'cancelled', intentKind: 'refund_initiation', label: 'WLT يُبدأ الاسترداد — الطلب ملغى', statusHint: 'processing', clientUiHint: 'جارٍ معالجة الاسترداد', walletBalanceVisible: false, refundEligibilityVisible: true, completionSignal: 'refund_pending_wlt', dshReadOnly: true, mutationForbidden: true, contractState: 'LIVE' },
  { clientState: 'failed', intentKind: 'refund_initiation', label: 'WLT يُبدأ الاسترداد — الطلب فشل', statusHint: 'processing', clientUiHint: 'جارٍ معالجة الاسترداد', walletBalanceVisible: false, refundEligibilityVisible: true, completionSignal: 'refund_pending_wlt', dshReadOnly: true, mutationForbidden: true, contractState: 'LIVE' },
  { clientState: 'refund_pending', intentKind: 'refund_initiation', label: 'WLT يُعالج الاسترداد', statusHint: 'processing', clientUiHint: 'جارٍ استرداد المبلغ...', walletBalanceVisible: true, refundEligibilityVisible: true, completionSignal: 'refund_pending_wlt', dshReadOnly: true, mutationForbidden: true, contractState: 'LIVE' },
  { clientState: 'refunded', intentKind: 'refund_completion', label: 'WLT أكّد الاسترداد الكامل', statusHint: 'completed', clientUiHint: 'تم استرداد المبلغ', walletBalanceVisible: true, refundEligibilityVisible: false, completionSignal: 'refund_completed_wlt', dshReadOnly: true, mutationForbidden: true, contractState: 'LIVE' },
  { clientState: 'support_required', intentKind: 'no_wlt_action', label: 'لا إجراء WLT — ينتظر قرار الدعم', statusHint: 'pending', clientUiHint: 'تواصل مع الدعم', walletBalanceVisible: false, refundEligibilityVisible: true, dshReadOnly: true, mutationForbidden: true, contractState: 'LIVE' },
  { clientState: 'wallet_credit_visible', intentKind: 'wallet_credit', label: 'WLT أودع رصيد في المحفظة — مرئي للعميل', statusHint: 'completed', clientUiHint: 'رصيد أُضيف لمحفظتك', walletBalanceVisible: true, refundEligibilityVisible: false, dshReadOnly: true, mutationForbidden: true, contractState: 'LIVE' },
  { clientState: 'wallet_refund_visible', intentKind: 'wallet_credit', label: 'WLT أكّد استرداد إلى المحفظة', statusHint: 'completed', clientUiHint: 'تم رد المبلغ لمحفظتك', walletBalanceVisible: true, refundEligibilityVisible: false, dshReadOnly: true, mutationForbidden: true, contractState: 'LIVE' },
] as const;

export type DshClientPaymentMethodWltEntry = {
  readonly methodId: string;
  readonly methodLabel: string;
  readonly intentKind: 'wallet_debit' | 'payment_initiation';
  readonly fromWltWallet: boolean;
  readonly externalGateway: boolean;
  readonly wltOwner: 'wlt';
  readonly dshReadOnly: true;
  readonly contractState: 'LIVE';
};

export const DSH_CLIENT_PAYMENT_METHOD_WLT_MAP: readonly DshClientPaymentMethodWltEntry[] = [
  { methodId: 'wallet', methodLabel: 'محفظة بثواني', intentKind: 'wallet_debit', fromWltWallet: true, externalGateway: false, wltOwner: 'wlt', dshReadOnly: true, contractState: 'LIVE' },
  { methodId: 'card', methodLabel: 'بطاقة ائتمانية', intentKind: 'payment_initiation', fromWltWallet: false, externalGateway: true, wltOwner: 'wlt', dshReadOnly: true, contractState: 'LIVE' },
  { methodId: 'mastercard', methodLabel: 'ماستر كارد', intentKind: 'payment_initiation', fromWltWallet: false, externalGateway: true, wltOwner: 'wlt', dshReadOnly: true, contractState: 'LIVE' },
  { methodId: 'jawal', methodLabel: 'جوالي', intentKind: 'payment_initiation', fromWltWallet: false, externalGateway: true, wltOwner: 'wlt', dshReadOnly: true, contractState: 'LIVE' },
  { methodId: 'jeeb', methodLabel: 'محفظة جيب', intentKind: 'payment_initiation', fromWltWallet: false, externalGateway: true, wltOwner: 'wlt', dshReadOnly: true, contractState: 'LIVE' },
  { methodId: 'cash', methodLabel: 'نقد', intentKind: 'payment_initiation', fromWltWallet: false, externalGateway: false, wltOwner: 'wlt', dshReadOnly: true, contractState: 'LIVE' },
  { methodId: 'one_cash', methodLabel: 'ONE كاش', intentKind: 'payment_initiation', fromWltWallet: false, externalGateway: true, wltOwner: 'wlt', dshReadOnly: true, contractState: 'LIVE' },
  { methodId: 'karimi', methodLabel: 'بنك الكريمي', intentKind: 'payment_initiation', fromWltWallet: false, externalGateway: true, wltOwner: 'wlt', dshReadOnly: true, contractState: 'LIVE' },
  { methodId: 'eazy', methodLabel: 'ايزي', intentKind: 'payment_initiation', fromWltWallet: false, externalGateway: true, wltOwner: 'wlt', dshReadOnly: true, contractState: 'LIVE' },
  { methodId: 'saba', methodLabel: 'سباكاش', intentKind: 'payment_initiation', fromWltWallet: false, externalGateway: true, wltOwner: 'wlt', dshReadOnly: true, contractState: 'LIVE' },
  { methodId: 'shamel', methodLabel: 'شامل موني', intentKind: 'payment_initiation', fromWltWallet: false, externalGateway: true, wltOwner: 'wlt', dshReadOnly: true, contractState: 'LIVE' },
  { methodId: 'mobile_money', methodLabel: 'موبايل موني', intentKind: 'payment_initiation', fromWltWallet: false, externalGateway: true, wltOwner: 'wlt', dshReadOnly: true, contractState: 'LIVE' },
  { methodId: 'tadamon', methodLabel: 'بنك التضامن', intentKind: 'payment_initiation', fromWltWallet: false, externalGateway: true, wltOwner: 'wlt', dshReadOnly: true, contractState: 'LIVE' },
  { methodId: 'pace', methodLabel: 'بيس', intentKind: 'payment_initiation', fromWltWallet: false, externalGateway: true, wltOwner: 'wlt', dshReadOnly: true, contractState: 'LIVE' },
] as const;

export type DshClientCodPaymentEntry = {
  readonly mode: DshFulfillmentDeliveryMode;
  readonly codAllowed: boolean;
  readonly codReason: string;
  readonly wltCodOwner: 'wlt';
  readonly dshReadOnly: true;
  readonly contractState: 'LIVE';
};

export const DSH_CLIENT_COD_BY_MODE: readonly DshClientCodPaymentEntry[] = [
  { mode: 'bthwani_delivery', codAllowed: true, codReason: 'الكابتن يحصّل النقد عند التسليم — WLT يتتبع ذمة COD', wltCodOwner: 'wlt', dshReadOnly: true, contractState: 'LIVE' },
  { mode: 'partner_delivery', codAllowed: false, codReason: 'موصل المتجر لا يحصّل نقد عبر WLT حالياً', wltCodOwner: 'wlt', dshReadOnly: true, contractState: 'LIVE' },
  { mode: 'pickup', codAllowed: false, codReason: 'الاستلام الذاتي لا يشمل تحصيل COD', wltCodOwner: 'wlt', dshReadOnly: true, contractState: 'LIVE' },
] as const;

export function getClientWltIntentForState(
  state: DshClientState,
): DshClientWltIntentEntry | undefined {
  return DSH_CLIENT_WLT_INTENT_MAP.find((e) => e.clientState === state);
}

function getPaymentMethodWltEntry(
  methodId: string,
): DshClientPaymentMethodWltEntry | undefined {
  return DSH_CLIENT_PAYMENT_METHOD_WLT_MAP.find((e) => e.methodId === methodId);
}

function isCodAllowedForMode(mode: DshFulfillmentDeliveryMode): boolean {
  return DSH_CLIENT_COD_BY_MODE.find((e) => e.mode === mode)?.codAllowed ?? false;
}

function shouldShowWalletBalanceAtState(state: DshClientState): boolean {
  return getClientWltIntentForState(state)?.walletBalanceVisible ?? false;
}

function shouldShowRefundEligibilityAtState(state: DshClientState): boolean {
  return getClientWltIntentForState(state)?.refundEligibilityVisible ?? false;
}
