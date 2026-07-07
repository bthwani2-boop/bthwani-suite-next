// Canonical location: dsh/frontend/shared/delivery/captain/captain.cod.ts
// Authority: dsh/frontend/shared/delivery/captain — captain COD state.

export type DshCaptainCodState =
  | 'no_cod'
  | 'cod_pending_pickup'
  | 'cod_collected'
  | 'cod_deposit_required'
  | 'cod_deposited'
  | 'cod_settled';

type DshCaptainCodEntry = {
  readonly orderId: string;
  readonly amountLabel: string;
  readonly state: DshCaptainCodState;
  readonly label: string;
  readonly actionRequired: boolean;
  readonly actionLabel: string;
  /** WLT intent — display only. Actual COD settlement is WLT-owned. */
  readonly wltIntentLabel: string;
  readonly wltReadOnly: true;
  readonly contractState: 'DSH_WLT_READ_ONLY_REFERENCE';
};

const DSH_CAPTAIN_COD_STATE_META: Record<DshCaptainCodState, {
  label: string;
  actionRequired: boolean;
  actionLabel: string;
  wltIntentLabel: string;
}> = {
  no_cod:               { label: 'دفع رقمي — لا نقد',             actionRequired: false, actionLabel: '',                              wltIntentLabel: 'لا أثر COD على WLT' },
  cod_pending_pickup:   { label: 'COD — ينتظر التحصيل',            actionRequired: false, actionLabel: '',                              wltIntentLabel: 'WLT يتتبع الطلب (قيد التحصيل)' },
  cod_collected:        { label: 'COD محصّل — في حيازة الكابتن',  actionRequired: true,  actionLabel: 'إيداع COD في نقطة التحصيل',    wltIntentLabel: 'WLT: ذمة COD قيد الإيداع' },
  cod_deposit_required: { label: 'إيداع COD مطلوب',                actionRequired: true,  actionLabel: 'إيداع المبلغ قبل نهاية الدورة', wltIntentLabel: 'WLT: تسوية COD قيد الانتظار' },
  cod_deposited:        { label: 'COD مُودَع — بانتظار WLT',       actionRequired: false, actionLabel: '',                              wltIntentLabel: 'WLT يعالج الإيداع' },
  cod_settled:          { label: 'COD مُسوَّى — مكتمل',            actionRequired: false, actionLabel: '',                              wltIntentLabel: 'WLT أكّد التسوية' },
};

/** Empty order summary model for captain surface initialization */
export const EMPTY_CAPTAIN_ORDER_SUMMARY = {
  orderId: '',
  pickupLabel: '',
  dropoffLabel: '',
  etaLabel: '',
  currentStageLabel: '',
  nextActionLabel: '',
} as const;
