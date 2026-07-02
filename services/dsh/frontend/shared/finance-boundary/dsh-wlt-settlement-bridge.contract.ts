import type {
  DshOperationalProofRequirement,
  DshSettlementInputEvent,
  DshSettlementInputEventType,
  DshSettlementInputStatus,
} from '../operations/dsh-operational.contract';

export const dshWltSettlementBridgeContractMeta = {
  dataKind: 'DSH_WLT_SETTLEMENT_BRIDGE_CONTRACT',
  runtimeTruth: false,
  backendSource: false,
  bindingSource: false,
  phase: 'PHASE_6_DSH_TO_WLT_SETTLEMENT_BRIDGE_CONTRACT',
  dshBoundary: 'DSH_SETTLEMENT_INPUT_ONLY',
  wltBoundary: 'WLT_OWNS_FINAL_FINANCIAL_TRUTH',
} as const;

export type DshWltSettlementSourceEntity =
  | 'order-operational-record'
  | 'delivery-trip'
  | 'store-preparation-record'
  | 'pickup-handoff-proof'
  | 'delivery-proof'
  | 'cod-collection-event'
  | 'operational-exception'
  | 'support-escalation-link';

export type DshWltTargetCapability =
  | 'wlt.payment-status-reference'
  | 'wlt.cod-liability-review'
  | 'wlt.partner-settlement-review'
  | 'wlt.captain-earnings-review'
  | 'wlt.refund-review'
  | 'wlt.reconciliation-review'
  | 'wlt.audit-review';

export type DshWltSettlementInputReadiness =
  | 'not-ready'
  | 'ready-for-wlt'
  | 'blocked-missing-proof'
  | 'blocked-by-exception'
  | 'blocked-by-wlt-rejection';

export type DshWltSettlementBridgeRule = {
  readonly sourceEventType: DshSettlementInputEventType;
  readonly sourceEntity: DshWltSettlementSourceEntity;
  readonly requiredOperationalProof: readonly DshOperationalProofRequirement[];
  readonly requiredIds: readonly string[];
  readonly amountSnapshotAllowed: boolean;
  readonly codSnapshotAllowed: boolean;
  readonly proofSnapshotAllowed: boolean;
  readonly exceptionSnapshotAllowed: boolean;
  readonly wltTargetCapability: DshWltTargetCapability;
  readonly auditRequired: boolean;
  readonly retryPolicy: 'none' | 'manual-after-proof-fix' | 'manual-after-wlt-rejection' | 'manual-audit-only';
  readonly noFinancialMutationInDsh: true;
  readonly notes: string;
};

export type DshWltSettlementInputCandidate = {
  readonly eventType: DshSettlementInputEventType;
  readonly sourceEntity: DshWltSettlementSourceEntity;
  readonly sourceOperationalRecordId: string;
  readonly orderId: string;
  readonly tripId?: string | undefined;
  readonly storeId?: string | undefined;
  readonly partnerId?: string | undefined;
  readonly captainId?: string | undefined;
  readonly amountSnapshot?: string | undefined;
  readonly codSnapshot?: string | undefined;
  readonly proofSnapshot?: string | undefined;
  readonly exceptionSnapshot?: string | undefined;
  readonly wltTargetCapability: DshWltTargetCapability;
  readonly handoffStatus: DshSettlementInputStatus;
  readonly rejectionReason?: string | undefined;
  readonly auditRequired: boolean;
  readonly noFinancialMutationInDsh: true;
};

export type DshWltSettlementInputValidationResult = {
  readonly readiness: DshWltSettlementInputReadiness;
  readonly missingIds: readonly string[];
  readonly missingProof: readonly DshOperationalProofRequirement[];
  readonly blockedReasons: readonly string[];
  readonly noFinancialMutationInDsh: true;
};

export const DSH_WLT_SETTLEMENT_BRIDGE_RULES: readonly DshWltSettlementBridgeRule[] = [
  {
    sourceEventType: 'DSH_ORDER_DELIVERED',
    sourceEntity: 'order-operational-record',
    requiredOperationalProof: ['audit-note', 'wlt-reference'],
    requiredIds: ['orderId', 'storeId', 'partnerId', 'sourceOperationalRecordId'],
    amountSnapshotAllowed: true,
    codSnapshotAllowed: false,
    proofSnapshotAllowed: true,
    exceptionSnapshotAllowed: true,
    wltTargetCapability: 'wlt.partner-settlement-review',
    auditRequired: true,
    retryPolicy: 'manual-after-proof-fix',
    noFinancialMutationInDsh: true,
    notes: 'Order delivered is operational evidence for WLT review; DSH does not settle the partner.',
  },
  {
    sourceEventType: 'DSH_TRIP_COMPLETED',
    sourceEntity: 'delivery-trip',
    requiredOperationalProof: ['photo-evidence', 'audit-note'],
    requiredIds: ['orderId', 'tripId', 'sourceOperationalRecordId'],
    amountSnapshotAllowed: false,
    codSnapshotAllowed: false,
    proofSnapshotAllowed: true,
    exceptionSnapshotAllowed: true,
    wltTargetCapability: 'wlt.captain-earnings-review',
    auditRequired: true,
    retryPolicy: 'manual-after-proof-fix',
    noFinancialMutationInDsh: true,
    notes: 'Trip completion can support WLT earnings review; earnings calculation is WLT owned.',
  },
  {
    sourceEventType: 'DSH_PARTNER_ORDER_COMPLETED',
    sourceEntity: 'store-preparation-record',
    requiredOperationalProof: ['audit-note'],
    requiredIds: ['orderId', 'storeId', 'partnerId', 'sourceOperationalRecordId'],
    amountSnapshotAllowed: true,
    codSnapshotAllowed: false,
    proofSnapshotAllowed: false,
    exceptionSnapshotAllowed: true,
    wltTargetCapability: 'wlt.partner-settlement-review',
    auditRequired: true,
    retryPolicy: 'manual-after-proof-fix',
    noFinancialMutationInDsh: true,
    notes: 'Partner completion is readiness evidence only; accounting remains in WLT.',
  },
  {
    sourceEventType: 'DSH_PARTNER_DELIVERY_COMPLETED',
    sourceEntity: 'delivery-trip',
    requiredOperationalProof: ['audit-note'],
    requiredIds: ['orderId', 'storeId', 'partnerId', 'sourceOperationalRecordId'],
    amountSnapshotAllowed: true,
    codSnapshotAllowed: false,
    proofSnapshotAllowed: true,
    exceptionSnapshotAllowed: true,
    wltTargetCapability: 'wlt.partner-settlement-review',
    auditRequired: true,
    retryPolicy: 'manual-after-proof-fix',
    noFinancialMutationInDsh: true,
    notes: 'Partner delivery mode creates operational evidence without replacing WLT partner settlement accounting.',
  },
  {
    sourceEventType: 'DSH_COD_COLLECTED',
    sourceEntity: 'cod-collection-event',
    requiredOperationalProof: ['cod-amount-snapshot', 'audit-note'],
    requiredIds: ['orderId', 'tripId', 'sourceOperationalRecordId'],
    amountSnapshotAllowed: true,
    codSnapshotAllowed: true,
    proofSnapshotAllowed: false,
    exceptionSnapshotAllowed: false,
    wltTargetCapability: 'wlt.cod-liability-review',
    auditRequired: true,
    retryPolicy: 'manual-after-wlt-rejection',
    noFinancialMutationInDsh: true,
    notes: 'COD collection is an input to WLT liability/reconciliation, not a DSH ledger event.',
  },
  {
    sourceEventType: 'DSH_COD_SHORTAGE',
    sourceEntity: 'cod-collection-event',
    requiredOperationalProof: ['cod-amount-snapshot', 'audit-note', 'wlt-reference'],
    requiredIds: ['orderId', 'tripId', 'sourceOperationalRecordId'],
    amountSnapshotAllowed: true,
    codSnapshotAllowed: true,
    proofSnapshotAllowed: false,
    exceptionSnapshotAllowed: true,
    wltTargetCapability: 'wlt.reconciliation-review',
    auditRequired: true,
    retryPolicy: 'manual-audit-only',
    noFinancialMutationInDsh: true,
    notes: 'Shortage is a WLT reconciliation candidate and must keep a DSH audit trail.',
  },
  {
    sourceEventType: 'DSH_POD_ACCEPTED',
    sourceEntity: 'delivery-proof',
    requiredOperationalProof: ['photo-evidence', 'otp-or-pin', 'audit-note'],
    requiredIds: ['orderId', 'tripId', 'sourceOperationalRecordId'],
    amountSnapshotAllowed: false,
    codSnapshotAllowed: false,
    proofSnapshotAllowed: true,
    exceptionSnapshotAllowed: false,
    wltTargetCapability: 'wlt.partner-settlement-review',
    auditRequired: true,
    retryPolicy: 'manual-after-proof-fix',
    noFinancialMutationInDsh: true,
    notes: 'Accepted proof can unblock WLT review but does not settle money in DSH.',
  },
  {
    sourceEventType: 'DSH_POD_REJECTED',
    sourceEntity: 'delivery-proof',
    requiredOperationalProof: ['photo-evidence', 'audit-note'],
    requiredIds: ['orderId', 'tripId', 'sourceOperationalRecordId'],
    amountSnapshotAllowed: false,
    codSnapshotAllowed: false,
    proofSnapshotAllowed: true,
    exceptionSnapshotAllowed: true,
    wltTargetCapability: 'wlt.audit-review',
    auditRequired: true,
    retryPolicy: 'manual-audit-only',
    noFinancialMutationInDsh: true,
    notes: 'Rejected proof creates an audit candidate until WLT/support decide financial consequences.',
  },
  {
    sourceEventType: 'DSH_ITEM_ADJUSTMENT_CONFIRMED',
    sourceEntity: 'store-preparation-record',
    requiredOperationalProof: ['audit-note'],
    requiredIds: ['orderId', 'storeId', 'partnerId', 'sourceOperationalRecordId'],
    amountSnapshotAllowed: true,
    codSnapshotAllowed: false,
    proofSnapshotAllowed: false,
    exceptionSnapshotAllowed: true,
    wltTargetCapability: 'wlt.refund-review',
    auditRequired: true,
    retryPolicy: 'manual-after-proof-fix',
    noFinancialMutationInDsh: true,
    notes: 'Item adjustment is a reasoned operational input; refund math remains WLT owned.',
  },
  {
    sourceEventType: 'DSH_REFUND_REASON_CONFIRMED',
    sourceEntity: 'support-escalation-link',
    requiredOperationalProof: ['support-ticket-reference', 'audit-note', 'wlt-reference'],
    requiredIds: ['orderId', 'sourceOperationalRecordId'],
    amountSnapshotAllowed: true,
    codSnapshotAllowed: false,
    proofSnapshotAllowed: true,
    exceptionSnapshotAllowed: true,
    wltTargetCapability: 'wlt.refund-review',
    auditRequired: true,
    retryPolicy: 'manual-after-wlt-rejection',
    noFinancialMutationInDsh: true,
    notes: 'Refund reason confirmation is a handoff to WLT refund review, not a DSH refund mutation.',
  },
  {
    sourceEventType: 'DSH_ORDER_CANCELLED_AFTER_PAYMENT',
    sourceEntity: 'order-operational-record',
    requiredOperationalProof: ['support-ticket-reference', 'audit-note', 'wlt-reference'],
    requiredIds: ['orderId', 'storeId', 'partnerId', 'sourceOperationalRecordId'],
    amountSnapshotAllowed: true,
    codSnapshotAllowed: false,
    proofSnapshotAllowed: false,
    exceptionSnapshotAllowed: true,
    wltTargetCapability: 'wlt.refund-review',
    auditRequired: true,
    retryPolicy: 'manual-after-wlt-rejection',
    noFinancialMutationInDsh: true,
    notes: 'Post-payment cancellation can only request WLT review; DSH never reverses wallet or ledger state.',
  },
  {
    sourceEventType: 'DSH_EXCEPTION_AUDIT_REQUIRED',
    sourceEntity: 'operational-exception',
    requiredOperationalProof: ['support-ticket-reference', 'audit-note'],
    requiredIds: ['orderId', 'sourceOperationalRecordId'],
    amountSnapshotAllowed: false,
    codSnapshotAllowed: false,
    proofSnapshotAllowed: true,
    exceptionSnapshotAllowed: true,
    wltTargetCapability: 'wlt.audit-review',
    auditRequired: true,
    retryPolicy: 'manual-audit-only',
    noFinancialMutationInDsh: true,
    notes: 'Exception audit keeps operational facts explicit before any WLT financial decision.',
  },
] as const;

export function getDshWltSettlementBridgeRules(): readonly DshWltSettlementBridgeRule[] {
  return DSH_WLT_SETTLEMENT_BRIDGE_RULES;
}

export function getDshWltSettlementBridgeRule(
  eventType: DshSettlementInputEventType,
): DshWltSettlementBridgeRule | undefined {
  return DSH_WLT_SETTLEMENT_BRIDGE_RULES.find((rule) => rule.sourceEventType === eventType);
}

export function classifyWltTargetCapability(
  eventType: DshSettlementInputEventType,
): DshWltTargetCapability | undefined {
  return getDshWltSettlementBridgeRule(eventType)?.wltTargetCapability;
}

export function assertNoDshFinancialSettlementOwnership<T extends { readonly noFinancialMutationInDsh: true }>(
  candidate: T,
): T {
  if (candidate.noFinancialMutationInDsh !== true) {
    throw new Error('DSH settlement bridge candidate is missing noFinancialMutationInDsh=true.');
  }

  return candidate;
}

export function buildWltSettlementInputCandidate(
  input: Omit<DshWltSettlementInputCandidate, 'wltTargetCapability' | 'auditRequired' | 'noFinancialMutationInDsh'>,
): DshWltSettlementInputCandidate {
  const rule = getDshWltSettlementBridgeRule(input.eventType);
  if (!rule) {
    throw new Error(`Unsupported DSH settlement input event type: ${input.eventType}`);
  }

  return assertNoDshFinancialSettlementOwnership({
    ...input,
    sourceEntity: rule.sourceEntity,
    wltTargetCapability: rule.wltTargetCapability,
    auditRequired: rule.auditRequired,
    noFinancialMutationInDsh: true,
  });
}

export function buildWltSettlementInputCandidateFromEvent(
  event: DshSettlementInputEvent,
): DshWltSettlementInputCandidate {
  const rule = getDshWltSettlementBridgeRule(event.eventType);
  if (!rule) {
    throw new Error(`Unsupported DSH settlement input event type: ${event.eventType}`);
  }

  return buildWltSettlementInputCandidate({
    eventType: event.eventType,
    sourceEntity: rule.sourceEntity,
    sourceOperationalRecordId: event.sourceOperationalRecordId,
    orderId: event.orderId,
    tripId: event.tripId,
    storeId: event.storeId,
    partnerId: event.partnerId,
    captainId: event.captainId,
    amountSnapshot: event.amountSnapshot,
    codSnapshot: event.codSnapshot,
    proofSnapshot: event.proofSnapshot,
    exceptionSnapshot: event.exceptionSnapshot,
    handoffStatus: event.handoffStatus,
  });
}

export function validateDshSettlementInputReadiness(
  candidate: DshWltSettlementInputCandidate,
  availableProof: readonly DshOperationalProofRequirement[],
): DshWltSettlementInputValidationResult {
  const rule = getDshWltSettlementBridgeRule(candidate.eventType);
  if (!rule) {
    return {
      readiness: 'not-ready',
      missingIds: [],
      missingProof: [],
      blockedReasons: [`Unsupported event type: ${candidate.eventType}`],
      noFinancialMutationInDsh: true,
    };
  }

  const candidateIds: Record<string, string | undefined> = {
    orderId: candidate.orderId,
    tripId: candidate.tripId,
    storeId: candidate.storeId,
    partnerId: candidate.partnerId,
    captainId: candidate.captainId,
    sourceOperationalRecordId: candidate.sourceOperationalRecordId,
  };
  const missingIds = rule.requiredIds.filter((id) => !candidateIds[id]);
  const proofSet = new Set(availableProof);
  const missingProof = rule.requiredOperationalProof.filter((proof) => !proofSet.has(proof));
  const blockedReasons: string[] = [];

  if (candidate.handoffStatus === 'blocked-by-exception') {
    blockedReasons.push('handoff is blocked by operational exception');
  }
  if (candidate.handoffStatus === 'rejected-by-wlt') {
    blockedReasons.push(candidate.rejectionReason ?? 'handoff was rejected by WLT');
  }
  if (candidate.amountSnapshot && !rule.amountSnapshotAllowed) {
    blockedReasons.push('amount snapshot is not allowed for this event type');
  }
  if (candidate.codSnapshot && !rule.codSnapshotAllowed) {
    blockedReasons.push('COD snapshot is not allowed for this event type');
  }
  if (candidate.proofSnapshot && !rule.proofSnapshotAllowed) {
    blockedReasons.push('proof snapshot is not allowed for this event type');
  }
  if (candidate.exceptionSnapshot && !rule.exceptionSnapshotAllowed) {
    blockedReasons.push('exception snapshot is not allowed for this event type');
  }

  const readiness: DshWltSettlementInputReadiness =
    missingIds.length > 0 || missingProof.length > 0
      ? missingProof.length > 0
        ? 'blocked-missing-proof'
        : 'not-ready'
      : blockedReasons.some((reason) => reason.includes('exception'))
        ? 'blocked-by-exception'
        : blockedReasons.some((reason) => reason.includes('WLT'))
          ? 'blocked-by-wlt-rejection'
          : blockedReasons.length > 0
            ? 'not-ready'
            : 'ready-for-wlt';

  return {
    readiness,
    missingIds,
    missingProof,
    blockedReasons,
    noFinancialMutationInDsh: true,
  };
}
