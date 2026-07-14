export type DshSurfaceId =
  | 'app-client'
  | 'app-partner'
  | 'app-captain'
  | 'app-field'
  | 'control-panel'
  | 'wlt-finance';

/**
 * On-demand contract: IDs/summaries first, heavy payloads only on explicit open.
 * summary-only       — identifier + label only; no detail loaded.
 * detail-on-open     — full detail loaded when user opens the flow.
 * evidence-on-open   — proof/attachments loaded only when evidence panel opens.
 * chat-on-open       — conversation thread loaded only when chat opens.
 * finance-snapshot-only — financial snapshot loaded read-only when finance panel opens.
 */
export type DshOnDemandPolicy =
  | 'summary-only'
  | 'detail-on-open'
  | 'evidence-on-open'
  | 'chat-on-open'
  | 'finance-snapshot-only';

const dshOperationalContractMeta = {
  dataKind: 'OPERATIONAL_CONTRACT',
  runtimeTruth: false,
  backendSource: false,
  bindingSource: false,
  phase: 'PHASE_1_CONTRACTS_ONLY',
} as const;

export type DshOperationalEntityId =
  | 'partner-store-onboarding'
  | 'catalog-readiness'
  | 'order-operational-truth'
  | 'delivery-trip'
  | 'captain-assignment'
  | 'store-preparation'
  | 'pickup-handoff'
  | 'proof-of-delivery'
  | 'cod-collection'
  | 'operational-exception'
  | 'support-escalation'
  | 'settlement-input-bridge'
  | 'control-panel-operation';

export type DshOperationalEntityKind =
  | 'partner-store-operational-record'
  | 'catalog-operational-item'
  | 'order-operational-record'
  | 'delivery-trip'
  | 'captain-assignment'
  | 'store-preparation-record'
  | 'pickup-handoff-proof'
  | 'delivery-proof'
  | 'cod-collection-event'
  | 'operational-exception'
  | 'support-escalation-link'
  | 'settlement-input-event'
  | 'control-panel-operation-record';

export type DshOperationalDataClassification =
  | 'SCAFFOLD'
  | 'RUNTIME_UNPROVEN'
  | 'RUNTIME_PROVEN'
  | 'WLT_READ_ONLY_REFERENCE';

export type DshOperationalProofRequirement =
  | 'none'
  | 'document-reference'
  | 'field-visit-evidence'
  | 'media-reference'
  | 'pickup-code'
  | 'qr-code'
  | 'barcode'
  | 'photo-evidence'
  | 'otp-or-pin'
  | 'signature'
  | 'cod-amount-snapshot'
  | 'support-ticket-reference'
  | 'audit-note'
  | 'wlt-reference';

export type DshOperationalAuditState =
  | 'not-required'
  | 'required'
  | 'pending'
  | 'recorded'
  | 'rejected'
  | 'blocked';

export type DshOperationalRollbackHint =
  | 'not-applicable'
  | 'operator-review-required'
  | 'restore-previous-operational-state'
  | 'reassign-owner'
  | 'open-exception'
  | 'wlt-review-required';

export type DshOperationalWltImpact =
  | 'none'
  | 'payment-status-read-only'
  | 'eligibility-read-only'
  | 'settlement-input-candidate'
  | 'cod-liability-candidate'
  | 'refund-review-candidate'
  | 'audit-candidate'
  | 'wlt-owned-financial-truth';

export type DshWltOwnershipBoundary =
  | 'NO_WLT_IMPACT'
  | 'WLT_READ_ONLY'
  | 'DSH_SETTLEMENT_INPUT_ONLY'
  | 'WLT_OWNS_FINAL_FINANCIAL_TRUTH';

export type DshOperationalClosureStatus =
  | 'missing-contract'
  | 'contract-defined'
  | 'registry-defined'
  | 'snapshot-adapter-needed'
  | 'surface-binding-needed'
  | 'needs-visual-evidence'
  | 'runtime-unproven'
  | 'blocked-by-wlt';

export type CanonicalOperationsGroupId =
  | 'command-center'
  | 'live-orders'
  | 'dispatch-capacity'
  | 'exceptions'
  | 'special-ops';

export type DshControlPanelOperationalWorkspace =
  | 'orders-queue'
  | 'trips-board'
  | 'captain-assignment-board'
  | 'store-preparation-sla'
  | 'pickup-handoff-monitor'
  | 'pod-review-queue'
  | 'cod-discrepancy-queue'
  | 'exception-queue'
  | 'support-escalation-queue'
  | 'settlement-inputs-snapshot'
  | 'wlt-finance-bridge'
  | 'audit-rollback';

type DshOperationalActionPolicy = {
  readonly allowedActions: readonly string[];
  readonly forbiddenActions: readonly string[];
};

export type DshOperationalAuditPolicy = {
  readonly auditRequired: boolean;
  readonly rollbackRequired: boolean;
  readonly rollbackHint: DshOperationalRollbackHint;
};

export type DshOperationalBoundaryPolicy = {
  readonly wltImpact: DshOperationalWltImpact;
  readonly wltOwnershipBoundary: DshWltOwnershipBoundary;
  readonly noFinancialMutationInDsh: true;
};

export type DshOperationalBaseRecord = {
  readonly id: string;
  readonly entityKind: DshOperationalEntityKind;
  readonly ownerSurface: DshSurfaceId;
  readonly visibleSurfaces: readonly DshSurfaceId[];
  readonly lifecycleStatus: string;
  readonly currentOperationalOwner: DshSurfaceId;
  readonly requiredProof: readonly DshOperationalProofRequirement[];
  readonly auditState: DshOperationalAuditState;
  readonly rollbackHint: DshOperationalRollbackHint;
  readonly dataClassification: DshOperationalDataClassification;
  readonly runtimeTruth: boolean;
  readonly backendSource: boolean;
  readonly bindingSource: boolean;
  readonly wltImpact: DshOperationalWltImpact;
  readonly wltOwnershipBoundary: DshWltOwnershipBoundary;
  readonly onDemandPolicy: DshOnDemandPolicy;
  readonly createdAt?: string;
  readonly updatedAt?: string;
};

export type DshPartnerStoreOnboardingStatus =
  | 'lead-created'
  | 'field-visit-scheduled'
  | 'field-visit-completed'
  | 'documents-collected'
  | 'store-profile-verified'
  | 'store-location-verified'
  | 'media-collected'
  | 'operating-hours-verified'
  | 'delivery-capabilities-declared'
  | 'catalog-seed-ready'
  | 'partner-contract-ready'
  | 'store-approved'
  | 'store-active'
  | 'blocked';

export type DshPartnerStoreOperationalRecord = DshOperationalBaseRecord & {
  readonly entityKind: 'partner-store-operational-record';
  readonly storeId: string;
  readonly partnerId: string;
  readonly fieldLeadId?: string;
  readonly storeName: string;
  readonly ownerName?: string;
  readonly documentsState: string;
  readonly visitState: string;
  readonly mediaState: string;
  readonly catalogReadinessState: string;
  readonly deliveryCapabilityState: string;
  readonly approvalState: DshPartnerStoreOnboardingStatus;
  readonly riskState: string;
};

export type DshCatalogReadinessStatus =
  | 'draft'
  | 'identity-ready'
  | 'media-ready'
  | 'category-ready'
  | 'price-display-ready'
  | 'availability-ready'
  | 'approval-pending'
  | 'published'
  | 'hidden'
  | 'blocked';

export type DshCatalogOperationalItem = DshOperationalBaseRecord & {
  readonly entityKind: 'catalog-operational-item';
  readonly productId: string;
  readonly storeId: string;
  readonly sku?: string;
  readonly gtin?: string;
  readonly barcode?: string;
  readonly categoryId: string;
  readonly subcategoryId?: string;
  readonly mediaKey?: string;
  readonly publishStage: DshCatalogReadinessStatus;
  readonly visibilityState: string;
  readonly availabilityState: string;
  readonly stockState: string;
  readonly priceDisplaySnapshot?: string;
  readonly partnerOverrideState: string;
  readonly fieldEvidenceState: string;
  readonly approvalState: string;
};

export type DshOrderOperationalStatus =
  | 'draft'
  | 'serviceability-checked'
  | 'cart-validated'
  | 'checkout-intent-created'
  | 'payment-pending'
  | 'payment-authorized-by-wlt'
  | 'order-created'
  | 'operations-review-required'
  | 'partner-pending'
  | 'partner-accepted'
  | 'partner-rejected'
  | 'preparing'
  | 'ready-for-pickup'
  | 'assignment-pending'
  | 'captain-assigned'
  | 'pickup-in-progress'
  | 'picked-up'
  | 'out-for-delivery'
  | 'near-customer'
  | 'at-door'
  | 'pod-pending'
  | 'delivered'
  | 'failed'
  | 'returned'
  | 'cancelled'
  | 'refund-reason-confirmed'
  | 'operationally-closed'
  | 'settlement-input-generated';

export type DshOrderOperationalRecord = DshOperationalBaseRecord & {
  readonly entityKind: 'order-operational-record';
  readonly orderId: string;
  readonly clientId: string;
  readonly storeId: string;
  readonly partnerId: string;
  readonly captainId?: string;
  readonly tripId?: string;
  readonly deliveryMode: string;
  readonly paymentMode: string;
  readonly paymentIntentRef?: string;
  readonly wltReference?: string;
  readonly currentLifecycleStatus: DshOrderOperationalStatus;
  readonly slaState: string;
  readonly exceptionState: string;
  readonly supportState: string;
  readonly codState: string;
  readonly proofState: string;
  readonly settlementInputState: string;
};

export type DshDeliveryTripStatus =
  | 'created'
  | 'assignment-pending'
  | 'assigned'
  | 'accepted'
  | 'captain-enroute-to-pickup'
  | 'arrived-pickup'
  | 'pickup-verification-pending'
  | 'pickup-verified'
  | 'picked-up'
  | 'out-for-delivery'
  | 'near-customer'
  | 'at-door'
  | 'pod-pending'
  | 'pod-submitted'
  | 'pod-accepted'
  | 'delivered'
  | 'failed'
  | 'returned'
  | 'reassigned'
  | 'closed';

export type DshDeliveryTrip = DshOperationalBaseRecord & {
  readonly entityKind: 'delivery-trip';
  readonly tripId: string;
  readonly orderId: string;
  readonly storeId: string;
  readonly captainId?: string;
  readonly deliveryMode: string;
  readonly assignmentId?: string;
  readonly pickupLocationRef: string;
  readonly dropoffLocationRef: string;
  readonly routeMode: string;
  readonly tripStatus: DshDeliveryTripStatus;
  readonly pickupStatus: string;
  readonly deliveryStatus: string;
  readonly distanceMeters?: number;
  readonly durationSeconds?: number;
  readonly proofRequired: boolean;
  readonly proofStatus: string;
  readonly codRequired: boolean;
  readonly codState: string;
  readonly exceptionState: string;
};

export type DshCaptainAssignmentStatus =
  | 'pending-candidates'
  | 'eligibility-checking'
  | 'eligible-candidates-found'
  | 'no-eligible-captain'
  | 'offer-sent'
  | 'accepted'
  | 'declined'
  | 'timed-out'
  | 'no-show'
  | 'reassignment-required'
  | 'reassigned'
  | 'locked'
  | 'cancelled';

export type DshCaptainAssignment = DshOperationalBaseRecord & {
  readonly entityKind: 'captain-assignment';
  readonly assignmentId: string;
  readonly orderId: string;
  readonly tripId: string;
  readonly candidateCaptainIds: readonly string[];
  readonly selectedCaptainId?: string;
  readonly eligibilitySnapshotFromWlt?: string;
  readonly availabilitySnapshot?: string;
  readonly distanceSnapshot?: string;
  readonly assignmentAttemptNo: number;
  readonly assignmentStatus: DshCaptainAssignmentStatus;
  readonly reassignmentReason?: string;
};

export type DshStorePreparationStatus =
  | 'order-received'
  | 'accepted'
  | 'rejected-with-reason'
  | 'preparing'
  | 'item-unavailable'
  | 'substitution-requested'
  | 'substitution-accepted'
  | 'substitution-rejected'
  | 'ready-for-pickup'
  | 'handoff-pending'
  | 'handoff-verified'
  | 'store-delivered'
  | 'closed';

export type DshStorePreparationRecord = DshOperationalBaseRecord & {
  readonly entityKind: 'store-preparation-record';
  readonly preparationId: string;
  readonly orderId: string;
  readonly storeId: string;
  readonly partnerId: string;
  readonly preparationStatus: DshStorePreparationStatus;
  readonly etaMinutes?: number;
  readonly itemIssueState: string;
  readonly substitutionState: string;
  readonly storeDelayReason?: string;
  readonly handoffState: string;
};

export type DshPickupHandoffStatus =
  | 'not-required'
  | 'pending'
  | 'code-generated'
  | 'captain-arrived'
  | 'store-confirmed'
  | 'captain-confirmed'
  | 'mismatch-reported'
  | 'photo-required'
  | 'verified'
  | 'failed'
  | 'audit-required';

export type DshPickupHandoffProof = DshOperationalBaseRecord & {
  readonly entityKind: 'pickup-handoff-proof';
  readonly handoffId: string;
  readonly orderId: string;
  readonly tripId?: string;
  readonly storeId: string;
  readonly captainId?: string;
  readonly partnerCourierId?: string;
  readonly proofType: DshOperationalProofRequirement;
  readonly photoEvidenceRef?: string;
  readonly storeConfirmedBy?: string;
  readonly captainConfirmedBy?: string;
  readonly itemMismatch: boolean;
  readonly missingItems: readonly string[];
  readonly extraItems: readonly string[];
  readonly storeDelayReason?: string;
  readonly handoffStatus: DshPickupHandoffStatus;
  readonly failedReason?: string;
};

export type DshDeliveryProofStatus =
  | 'not-required'
  | 'required'
  | 'pending-capture'
  | 'submitted'
  | 'auto-verified'
  | 'manual-review-required'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'audit-required';

export type DshDeliveryProof = DshOperationalBaseRecord & {
  readonly entityKind: 'delivery-proof';
  readonly proofId: string;
  readonly orderId: string;
  readonly tripId?: string;
  readonly proofType: DshOperationalProofRequirement;
  readonly capturedBy: string;
  readonly capturedAt?: string;
  readonly photoRef?: string;
  readonly signatureRef?: string;
  readonly verificationStatus: DshDeliveryProofStatus;
  readonly failureReason?: string;
  readonly customerVisible: boolean;
};

export type DshCodCollectionStatus =
  | 'not-required'
  | 'expected'
  | 'collected-full'
  | 'collected-partial'
  | 'not-collected'
  | 'discrepancy-detected'
  | 'handoff-to-wlt-pending'
  | 'handoff-to-wlt-completed'
  | 'audit-required';

export type DshCodCollectionEvent = DshOperationalBaseRecord & {
  readonly entityKind: 'cod-collection-event';
  readonly codEventId: string;
  readonly orderId: string;
  readonly tripId?: string;
  readonly expectedAmountMinor: number;
  readonly collectedAmountMinor: number;
  readonly currency: 'YER';
  readonly collectorType: 'captain' | 'partner-courier';
  readonly collectorId: string;
  readonly collectionStatus: DshCodCollectionStatus;
  readonly discrepancyAmountMinor: number;
  readonly discrepancyReason?: string;
  readonly handoffToWltStatus: string;
  readonly wltReference?: string;
};

export type DshOperationalExceptionType =
  | 'store-closed'
  | 'item-unavailable'
  | 'price-mismatch'
  | 'address-not-found'
  | 'customer-unreachable'
  | 'captain-no-show'
  | 'captain-unavailable'
  | 'handoff-mismatch'
  | 'pickup-failed'
  | 'delivery-failed'
  | 'unsafe-delivery'
  | 'payment-failed'
  | 'cod-shortage'
  | 'pod-rejected'
  | 'system-outage';

export type DshOperationalExceptionStatus =
  | 'opened'
  | 'triaged'
  | 'assigned'
  | 'waiting-partner'
  | 'waiting-captain'
  | 'waiting-client'
  | 'waiting-wlt'
  | 'resolved'
  | 'rejected'
  | 'escalated'
  | 'audit-required'
  | 'closed';

export type DshOperationalException = DshOperationalBaseRecord & {
  readonly entityKind: 'operational-exception';
  readonly exceptionId: string;
  readonly orderId: string;
  readonly tripId?: string;
  readonly storeId?: string;
  readonly captainId?: string;
  readonly type: DshOperationalExceptionType;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly status: DshOperationalExceptionStatus;
  readonly requiredAction: string;
  readonly supportTicketId?: string;
  readonly rollbackAction?: DshOperationalRollbackHint;
  readonly resolvedAt?: string;
};

export type DshSupportEscalationStatus =
  | 'opened'
  | 'linked'
  | 'waiting-client'
  | 'waiting-partner'
  | 'waiting-captain'
  | 'waiting-wlt'
  | 'resolved'
  | 'escalated'
  | 'closed';

export type DshSupportEscalationLink = DshOperationalBaseRecord & {
  readonly entityKind: 'support-escalation-link';
  readonly ticketId: string;
  readonly orderId: string;
  readonly tripId?: string;
  readonly exceptionId?: string;
  readonly wltReference?: string;
  readonly clientVisible: boolean;
  readonly partnerVisible: boolean;
  readonly captainVisible: boolean;
  readonly controlPanelOwner: DshSurfaceId;
  readonly status: DshSupportEscalationStatus;
  readonly resolutionType?: string;
  readonly rollbackAction?: DshOperationalRollbackHint;
};

export type DshSettlementInputEventType =
  | 'DSH_ORDER_DELIVERED'
  | 'DSH_TRIP_COMPLETED'
  | 'DSH_PARTNER_ORDER_COMPLETED'
  | 'DSH_PARTNER_DELIVERY_COMPLETED'
  | 'DSH_COD_COLLECTED'
  | 'DSH_COD_SHORTAGE'
  | 'DSH_POD_ACCEPTED'
  | 'DSH_POD_REJECTED'
  | 'DSH_PICKUP_HANDOFF_VERIFIED'
  | 'DSH_ITEM_ADJUSTMENT_CONFIRMED'
  | 'DSH_REFUND_REASON_CONFIRMED'
  | 'DSH_ORDER_CANCELLED_AFTER_PAYMENT'
  | 'DSH_EXCEPTION_AUDIT_REQUIRED'
  | 'DSH_OPERATIONAL_CLOSURE_APPROVED';

export type DshSettlementInputStatus =
  | 'not-ready'
  | 'ready'
  | 'blocked-by-exception'
  | 'pending-handoff'
  | 'sent-to-wlt'
  | 'accepted-by-wlt'
  | 'rejected-by-wlt'
  | 'needs-reconciliation'
  | 'closed';

export type DshSettlementInputEvent = DshOperationalBaseRecord & {
  readonly entityKind: 'settlement-input-event';
  readonly eventId: string;
  readonly eventType: DshSettlementInputEventType;
  readonly orderId: string;
  readonly tripId?: string;
  readonly storeId: string;
  readonly partnerId: string;
  readonly captainId?: string;
  readonly amountSnapshot?: string;
  readonly codSnapshot?: string;
  readonly proofSnapshot?: string;
  readonly exceptionSnapshot?: string;
  readonly sourceOperationalRecordId: string;
  readonly wltTargetCapability: string;
  readonly handoffStatus: DshSettlementInputStatus;
  readonly wltReference?: string;
};

export type DshControlPanelSideEffectClassification = 'snapshot-only' | 'runtime-later' | 'runtime-mutation';

export type DshControlPanelOperationRecord = DshOperationalBaseRecord & {
  readonly entityKind: 'control-panel-operation-record';
  readonly operationId: string;
  readonly service: 'dsh';
  readonly surface: 'control-panel';
  readonly rolePermission: string;
  readonly input: string;
  readonly validation: string;
  readonly sideEffectClassification: DshControlPanelSideEffectClassification;
  readonly auditLog: string;
  readonly rollbackUndo: DshOperationalRollbackHint;
  readonly evidence: readonly DshOperationalProofRequirement[];
  readonly ownerService: 'dsh' | 'wlt';
};

type DshAnyOperationalRecord =
  | DshPartnerStoreOperationalRecord
  | DshCatalogOperationalItem
  | DshOrderOperationalRecord
  | DshDeliveryTrip
  | DshCaptainAssignment
  | DshStorePreparationRecord
  | DshPickupHandoffProof
  | DshDeliveryProof
  | DshCodCollectionEvent
  | DshOperationalException
  | DshSupportEscalationLink
  | DshSettlementInputEvent
  | DshControlPanelOperationRecord;
