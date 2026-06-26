export type DshWltRefundBridgeStatus =
  | 'refund_pending_wlt'
  | 'refund_completed_wlt'
  | 'refund_rejected_wlt';

export type DshWltBridgeContractStatus =
  | 'connected'
  | 'pending_contract'
  | 'blocked';

export type DshWltFinanceBoundaryRecord = {
  readonly domain:
    | 'refund'
    | 'settlement'
    | 'payout'
    | 'commission'
    | 'platform-fee'
    | 'field-commission'
    | 'cod-liability'
    | 'ledger-journal'
    | 'captain-eligibility'
    | 'store-delivery-fee'
    | 'risk-audit';
  readonly source: 'WLT';
  readonly dshRole: 'view-only';
  readonly mutation: 'forbidden';
  readonly contractStatus: DshWltBridgeContractStatus;
  readonly contractStatusLabel: string;
  readonly lastSyncLabel: string;
  readonly affectedActor: string;
  readonly affectedEntityId?: string | undefined;
  readonly blockedReason?: string | undefined;
  readonly auditVisibilityRequired: boolean;
};

const CONTRACT_STATUS_LABELS: Record<DshWltBridgeContractStatus, string> = {
  connected: 'متصل — بيانات WLT حية',
  pending_contract: 'في انتظار ربط API — معاينة فقط',
  blocked: 'محظور — انظر سبب الحظر',
};

const WLT_REFUND_STATUS_LABELS: Record<DshWltRefundBridgeStatus, string> = {
  refund_pending_wlt: 'استرداد معلق — WLT',
  refund_completed_wlt: 'استرداد مكتمل — WLT',
  refund_rejected_wlt: 'استرداد مرفوض — WLT',
};

const WLT_REFUND_STATUS_TONES: Record<
  DshWltRefundBridgeStatus,
  'default' | 'success' | 'danger' | 'warning'
> = {
  refund_pending_wlt: 'warning',
  refund_completed_wlt: 'success',
  refund_rejected_wlt: 'danger',
};

export function getDshWltRefundStatusLabel(status: DshWltRefundBridgeStatus): string {
  return WLT_REFUND_STATUS_LABELS[status];
}

export function getDshWltRefundStatusTone(
  status: DshWltRefundBridgeStatus,
): 'default' | 'success' | 'danger' | 'warning' {
  return WLT_REFUND_STATUS_TONES[status];
}

export function buildDshWltFinanceBoundaryRecord(options: {
  domain: DshWltFinanceBoundaryRecord['domain'];
  contractStatus: DshWltBridgeContractStatus;
  affectedActor: string;
  affectedEntityId?: string;
  blockedReason?: string;
  auditVisibilityRequired?: boolean;
}): DshWltFinanceBoundaryRecord {
  return {
    domain: options.domain,
    source: 'WLT',
    dshRole: 'view-only',
    mutation: 'forbidden',
    contractStatus: options.contractStatus,
    contractStatusLabel: CONTRACT_STATUS_LABELS[options.contractStatus],
    lastSyncLabel:
      options.contractStatus === 'connected'
        ? 'مزامنة حية'
        : 'معاينة فقط — لا بيانات حية',
    affectedActor: options.affectedActor,
    affectedEntityId: options.affectedEntityId,
    blockedReason: options.blockedReason,
    auditVisibilityRequired: options.auditVisibilityRequired ?? false,
  };
}
