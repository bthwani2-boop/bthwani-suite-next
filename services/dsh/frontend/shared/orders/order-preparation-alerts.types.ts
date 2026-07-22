export type DshPreparationAlertKind =
  | 'due_soon'
  | 'overdue'
  | 'customer_decision_pending';

export type DshPreparationAlertStatus = 'open' | 'acknowledged' | 'resolved';

export type DshPreparationAlert = {
  readonly id: string;
  readonly orderId: string;
  readonly storeId: string;
  readonly kind: DshPreparationAlertKind;
  readonly status: DshPreparationAlertStatus;
  readonly estimateRevision: number;
  readonly detectedAt: string;
  readonly acknowledgedByActorId: string;
  readonly acknowledgedAt?: string | null;
  readonly resolvedAt?: string | null;
  readonly resolutionReason: string;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshRefreshPreparationAlertsResult = {
  readonly opened: number;
  readonly resolved: number;
  readonly active: number;
};

export const PREPARATION_ALERT_KIND_LABELS: Record<DshPreparationAlertKind, string> = {
  due_soon: 'اقترب موعد الجاهزية',
  overdue: 'تجاوز موعد الجاهزية',
  customer_decision_pending: 'قرار استبدال معلّق',
};

export const PREPARATION_ALERT_STATUS_LABELS: Record<DshPreparationAlertStatus, string> = {
  open: 'مفتوح',
  acknowledged: 'تمت المراجعة',
  resolved: 'أغلق تلقائيًا',
};
