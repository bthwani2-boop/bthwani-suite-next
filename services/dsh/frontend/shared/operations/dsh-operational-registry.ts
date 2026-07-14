import type {
  DshControlPanelOperationalWorkspace,
  DshOnDemandPolicy,
  DshOperationalAuditPolicy,
  DshOperationalBoundaryPolicy,
  DshOperationalClosureStatus,
  DshOperationalDataClassification,
  DshOperationalEntityId,
  DshOperationalEntityKind,
  DshOperationalProofRequirement,
  DshOperationalWltImpact,
  DshSurfaceId,
  DshWltOwnershipBoundary,
} from './dsh-operational.contract';

const dshOperationalRegistryMeta = {
  dataKind: 'OPERATIONAL_REGISTRY_METADATA_ONLY',
  runtimeTruth: false,
  backendSource: false,
  bindingSource: false,
  phase: 'PHASE_2_REGISTRY_ONLY',
} as const;

export type DshOperationalLifecycleSource =
  | 'dsh-partner-store-operational-record'
  | 'dsh-catalog-operational-item'
  | 'dsh-order-operational-record'
  | 'dsh-delivery-trip'
  | 'dsh-captain-assignment'
  | 'dsh-store-preparation-record'
  | 'dsh-pickup-handoff-proof'
  | 'dsh-delivery-proof'
  | 'dsh-cod-collection-event'
  | 'dsh-operational-exception'
  | 'dsh-support-escalation-link'
  | 'dsh-settlement-input-event'
  | 'dsh-control-panel-operation-record';

export type DshOperationalRegistryEntry = DshOperationalAuditPolicy &
  DshOperationalBoundaryPolicy & {
    readonly id: DshOperationalEntityId;
    readonly label: string;
    readonly entityKind: DshOperationalEntityKind;
    readonly ownerSurface: DshSurfaceId;
    readonly visibleSurfaces: readonly DshSurfaceId[];
    readonly lifecycleSource: DshOperationalLifecycleSource;
    readonly allowedActions: readonly string[];
    readonly forbiddenActions: readonly string[];
    readonly requiredProof: readonly DshOperationalProofRequirement[];
    readonly controlPanelWorkspace: DshControlPanelOperationalWorkspace;
    readonly onDemandPolicy: DshOnDemandPolicy;
    readonly dataClassification: DshOperationalDataClassification;
    readonly currentClosureStatus: DshOperationalClosureStatus;
    readonly currentEvidencePath?: string;
    readonly notes: string;
  };

const NO_FINANCIAL_MUTATION = [
  'ledger',
  'payout',
  'refund-accounting',
  'reconciliation',
  'wallet-balance-mutation',
  'captain-earnings-calculation',
  'partner-settlement-accounting',
  'financial-mutation',
] as const;

function boundary(
  wltImpact: DshOperationalWltImpact,
  wltOwnershipBoundary: DshWltOwnershipBoundary,
): DshOperationalBoundaryPolicy {
  return {
    wltImpact,
    wltOwnershipBoundary,
    noFinancialMutationInDsh: true,
  };
}

export const DSH_OPERATIONAL_REGISTRY: readonly DshOperationalRegistryEntry[] = [
  {
    id: 'partner-store-onboarding',
    label: 'Partner/store onboarding operational truth',
    entityKind: 'partner-store-operational-record',
    ownerSurface: 'app-field',
    visibleSurfaces: ['app-field', 'app-partner', 'control-panel'],
    lifecycleSource: 'dsh-partner-store-operational-record',
    allowedActions: ['schedule-field-visit', 'record-readiness', 'submit-evidence', 'request-approval'],
    forbiddenActions: ['publish-store-without-approval', 'create-financial-accounting'],
    requiredProof: ['document-reference', 'field-visit-evidence', 'media-reference', 'audit-note'],
    auditRequired: true,
    rollbackRequired: true,
    rollbackHint: 'restore-previous-operational-state',
    ...boundary('none', 'NO_WLT_IMPACT'),
    controlPanelWorkspace: 'audit-rollback',
    onDemandPolicy: 'evidence-on-open',
    dataClassification: 'RUNTIME_UNPROVEN',
    currentClosureStatus: 'registry-defined',
    currentEvidencePath: 'dsh/docs/RUNTIME_EVIDENCE_MATRIX.md',
    notes: 'Field owns visit/readiness evidence; partner sees approval state; control-panel approves or requests completion.',
  },
  {
    id: 'catalog-readiness',
    label: 'Catalog operational readiness',
    entityKind: 'catalog-operational-item',
    ownerSurface: 'app-partner',
    visibleSurfaces: ['app-client', 'app-partner', 'app-field', 'control-panel'],
    lifecycleSource: 'dsh-catalog-operational-item',
    allowedActions: ['update-item-readiness', 'request-publish-review', 'hide-item', 'attach-central-media-key'],
    forbiddenActions: ['duplicate-local-simulated-data', 'publish-unapproved-item', 'mutate-financial-settlement'],
    requiredProof: ['media-reference', 'audit-note'],
    auditRequired: true,
    rollbackRequired: true,
    rollbackHint: 'restore-previous-operational-state',
    ...boundary('none', 'NO_WLT_IMPACT'),
    controlPanelWorkspace: 'store-preparation-sla',
    onDemandPolicy: 'detail-on-open',
    dataClassification: 'RUNTIME_UNPROVEN',
    currentClosureStatus: 'registry-defined',
    currentEvidencePath: 'dsh/frontend/shared/products/products.contract.ts',
    notes: 'Catalog data remains central; surfaces must not clone product/media payloads locally.',
  },
  {
    id: 'order-operational-truth',
    label: 'Client order operational truth',
    entityKind: 'order-operational-record',
    ownerSurface: 'app-client',
    visibleSurfaces: ['app-client', 'app-partner', 'app-captain', 'control-panel'],
    lifecycleSource: 'dsh-order-operational-record',
    allowedActions: ['show-order-summary', 'show-current-owner', 'open-support-context', 'show-tracking-summary'],
    forbiddenActions: ['show-partner-internals-to-client', 'show-captain-internals-to-client', ...NO_FINANCIAL_MUTATION],
    requiredProof: ['support-ticket-reference', 'audit-note', 'wlt-reference'],
    auditRequired: true,
    rollbackRequired: true,
    rollbackHint: 'open-exception',
    ...boundary('payment-status-read-only', 'WLT_READ_ONLY'),
    controlPanelWorkspace: 'orders-queue',
    onDemandPolicy: 'detail-on-open',
    dataClassification: 'RUNTIME_UNPROVEN',
    currentClosureStatus: 'registry-defined',
    currentEvidencePath: 'dsh/frontend/shared/dsh-order-journey.model.ts',
    notes: 'Order lifecycle belongs to DSH; payment/refund truth stays WLT read-only.',
  },
  {
    id: 'delivery-trip',
    label: 'Delivery trip truth',
    entityKind: 'delivery-trip',
    ownerSurface: 'app-captain',
    visibleSurfaces: ['app-client', 'app-partner', 'app-captain', 'control-panel'],
    lifecycleSource: 'dsh-delivery-trip',
    allowedActions: ['show-trip-summary', 'record-trip-milestone', 'open-trip-exception', 'show-client-tracking-milestone'],
    forbiddenActions: ['calculate-captain-earnings', 'post-ledger-entry', 'bypass-proof-requirement'],
    requiredProof: ['pickup-code', 'photo-evidence', 'audit-note'],
    auditRequired: true,
    rollbackRequired: true,
    rollbackHint: 'reassign-owner',
    ...boundary('settlement-input-candidate', 'DSH_SETTLEMENT_INPUT_ONLY'),
    controlPanelWorkspace: 'trips-board',
    onDemandPolicy: 'detail-on-open',
    dataClassification: 'RUNTIME_UNPROVEN',
    currentClosureStatus: 'registry-defined',
    currentEvidencePath: 'dsh/docs/RUNTIME_EVIDENCE_MATRIX.md',
    notes: 'Trip is operational proof for WLT later; DSH does not account for the trip.',
  },
  {
    id: 'captain-assignment',
    label: 'Captain assignment workflow',
    entityKind: 'captain-assignment',
    ownerSurface: 'control-panel',
    visibleSurfaces: ['app-captain', 'control-panel', 'wlt-finance'],
    lifecycleSource: 'dsh-captain-assignment',
    allowedActions: ['offer-assignment', 'record-acceptance', 'record-decline', 'record-no-show', 'request-reassignment'],
    forbiddenActions: ['calculate-eligibility-in-dsh', 'calculate-captain-earnings', 'override-wlt-liability'],
    requiredProof: ['wlt-reference', 'audit-note'],
    auditRequired: true,
    rollbackRequired: true,
    rollbackHint: 'reassign-owner',
    ...boundary('eligibility-read-only', 'WLT_READ_ONLY'),
    controlPanelWorkspace: 'captain-assignment-board',
    onDemandPolicy: 'detail-on-open',
    dataClassification: 'WLT_READ_ONLY_REFERENCE',
    currentClosureStatus: 'registry-defined',
    currentEvidencePath: 'dsh/frontend/control-panel/operations/DispatchAssignmentScreen.tsx',
    notes: 'WLT may provide eligibility/liability read-only; DSH owns dispatch decision flow.',
  },
  {
    id: 'store-preparation',
    label: 'Store preparation workflow',
    entityKind: 'store-preparation-record',
    ownerSurface: 'app-partner',
    visibleSurfaces: ['app-partner', 'app-captain', 'control-panel'],
    lifecycleSource: 'dsh-store-preparation-record',
    allowedActions: ['accept-order', 'reject-with-reason', 'start-preparation', 'request-substitution', 'mark-ready', 'record-store-delivery'],
    forbiddenActions: ['mark-ready-with-unresolved-item-issue', 'mutate-price-accounting', 'settle-partner'],
    requiredProof: ['audit-note'],
    auditRequired: true,
    rollbackRequired: true,
    rollbackHint: 'restore-previous-operational-state',
    ...boundary('settlement-input-candidate', 'DSH_SETTLEMENT_INPUT_ONLY'),
    controlPanelWorkspace: 'store-preparation-sla',
    onDemandPolicy: 'detail-on-open',
    dataClassification: 'RUNTIME_UNPROVEN',
    currentClosureStatus: 'registry-defined',
    currentEvidencePath: 'dsh/frontend/app-partner/screens/OrdersInboxScreen.tsx',
    notes: 'Preparation records explain whether delay belongs to store, item issue, substitution, or handoff.',
  },
  {
    id: 'pickup-handoff',
    label: 'Pickup and handoff proof',
    entityKind: 'pickup-handoff-proof',
    ownerSurface: 'app-partner',
    visibleSurfaces: ['app-partner', 'app-captain', 'control-panel'],
    lifecycleSource: 'dsh-pickup-handoff-proof',
    allowedActions: ['generate-code', 'scan-proof', 'attach-photo', 'record-mismatch', 'verify-handoff'],
    forbiddenActions: ['verify-without-arrival', 'close-mismatch-without-audit', 'create-ledger-entry'],
    requiredProof: ['pickup-code', 'qr-code', 'barcode', 'photo-evidence', 'audit-note'],
    auditRequired: true,
    rollbackRequired: true,
    rollbackHint: 'open-exception',
    ...boundary('settlement-input-candidate', 'DSH_SETTLEMENT_INPUT_ONLY'),
    controlPanelWorkspace: 'pickup-handoff-monitor',
    onDemandPolicy: 'evidence-on-open',
    dataClassification: 'RUNTIME_UNPROVEN',
    currentClosureStatus: 'registry-defined',
    currentEvidencePath: 'dsh/docs/RUNTIME_EVIDENCE_MATRIX.md',
    notes: 'Pickup proof prevents store/captain handoff disputes from becoming untraceable.',
  },
  {
    id: 'proof-of-delivery',
    label: 'Proof of delivery',
    entityKind: 'delivery-proof',
    ownerSurface: 'app-captain',
    visibleSurfaces: ['app-client', 'app-captain', 'control-panel'],
    lifecycleSource: 'dsh-delivery-proof',
    allowedActions: ['capture-proof', 'submit-proof', 'request-manual-review', 'show-client-delivered-state'],
    forbiddenActions: ['mark-delivered-with-rejected-proof', 'create-refund', 'post-settlement'],
    requiredProof: ['photo-evidence', 'otp-or-pin', 'signature', 'audit-note'],
    auditRequired: true,
    rollbackRequired: true,
    rollbackHint: 'open-exception',
    ...boundary('settlement-input-candidate', 'DSH_SETTLEMENT_INPUT_ONLY'),
    controlPanelWorkspace: 'pod-review-queue',
    onDemandPolicy: 'evidence-on-open',
    dataClassification: 'RUNTIME_UNPROVEN',
    currentClosureStatus: 'registry-defined',
    currentEvidencePath: 'dsh/frontend/app-captain/screens/DshCaptainPoDSubmissionScreen.tsx',
    notes: 'PoD acceptance can become WLT evidence; PoD rejection can become audit candidate.',
  },
  {
    id: 'cod-collection',
    label: 'COD collection event',
    entityKind: 'cod-collection-event',
    ownerSurface: 'app-captain',
    visibleSurfaces: ['app-captain', 'app-partner', 'control-panel', 'wlt-finance'],
    lifecycleSource: 'dsh-cod-collection-event',
    allowedActions: ['record-expected-amount', 'record-collected-amount', 'record-discrepancy', 'handoff-to-wlt'],
    forbiddenActions: ['create-cod-liability-in-dsh', 'settle-captain', 'post-ledger-entry'],
    requiredProof: ['cod-amount-snapshot', 'wlt-reference', 'audit-note'],
    auditRequired: true,
    rollbackRequired: true,
    rollbackHint: 'wlt-review-required',
    ...boundary('cod-liability-candidate', 'WLT_OWNS_FINAL_FINANCIAL_TRUTH'),
    controlPanelWorkspace: 'cod-discrepancy-queue',
    onDemandPolicy: 'detail-on-open',
    dataClassification: 'WLT_READ_ONLY_REFERENCE',
    currentClosureStatus: 'blocked-by-wlt',
    currentEvidencePath: 'wlt/SERVICE_BLUEPRINT.md',
    notes: 'DSH records COD event only; WLT owns liability, ledger, reconciliation, and settlement.',
  },
  {
    id: 'operational-exception',
    label: 'Operational exception queue',
    entityKind: 'operational-exception',
    ownerSurface: 'control-panel',
    visibleSurfaces: ['app-client', 'app-partner', 'app-captain', 'app-field', 'control-panel', 'wlt-finance'],
    lifecycleSource: 'dsh-operational-exception',
    allowedActions: ['open-exception', 'triage', 'assign-owner', 'link-support-ticket', 'request-audit', 'resolve-operationally'],
    forbiddenActions: ['close-without-owner', 'convert-to-financial-adjustment-in-dsh', 'hide-from-audit'],
    requiredProof: ['support-ticket-reference', 'audit-note', 'wlt-reference'],
    auditRequired: true,
    rollbackRequired: true,
    rollbackHint: 'restore-previous-operational-state',
    ...boundary('audit-candidate', 'DSH_SETTLEMENT_INPUT_ONLY'),
    controlPanelWorkspace: 'exception-queue',
    onDemandPolicy: 'detail-on-open',
    dataClassification: 'RUNTIME_UNPROVEN',
    currentClosureStatus: 'registry-defined',
    currentEvidencePath: 'dsh/frontend/control-panel/operations/ExceptionsEscalationsScreen.tsx',
    notes: 'Exceptions are operational first; any financial impact is handed to WLT as an audit candidate.',
  },
  {
    id: 'support-escalation',
    label: 'Support escalation link',
    entityKind: 'support-escalation-link',
    ownerSurface: 'control-panel',
    visibleSurfaces: ['app-client', 'app-partner', 'app-captain', 'control-panel', 'wlt-finance'],
    lifecycleSource: 'dsh-support-escalation-link',
    allowedActions: ['link-ticket-to-order', 'link-ticket-to-trip', 'link-ticket-to-exception', 'show-read-only-wlt-reference'],
    forbiddenActions: ['resolve-financial-refund-in-dsh', 'detach-ticket-from-order-context', 'duplicate-support-payloads'],
    requiredProof: ['support-ticket-reference', 'wlt-reference', 'audit-note'],
    auditRequired: true,
    rollbackRequired: true,
    rollbackHint: 'operator-review-required',
    ...boundary('refund-review-candidate', 'WLT_READ_ONLY'),
    controlPanelWorkspace: 'support-escalation-queue',
    onDemandPolicy: 'detail-on-open',
    dataClassification: 'RUNTIME_UNPROVEN',
    currentClosureStatus: 'registry-defined',
    currentEvidencePath: 'dsh/frontend/control-panel/support/SupportDashboardScreen.tsx',
    notes: 'Support must stay linked to order/trip/exception context instead of becoming detached ticket data.',
  },
  {
    id: 'settlement-input-bridge',
    label: 'Settlement input bridge to WLT',
    entityKind: 'settlement-input-event',
    ownerSurface: 'control-panel',
    visibleSurfaces: ['control-panel', 'wlt-finance'],
    lifecycleSource: 'dsh-settlement-input-event',
    allowedActions: ['build-settlement-input-candidate', 'validate-operational-proof', 'send-readiness-to-wlt', 'record-wlt-rejection'],
    forbiddenActions: [...NO_FINANCIAL_MUTATION, 'accept-settlement-as-dsh-truth'],
    requiredProof: ['pickup-code', 'photo-evidence', 'cod-amount-snapshot', 'wlt-reference', 'audit-note'],
    auditRequired: true,
    rollbackRequired: true,
    rollbackHint: 'wlt-review-required',
    ...boundary('settlement-input-candidate', 'WLT_OWNS_FINAL_FINANCIAL_TRUTH'),
    controlPanelWorkspace: 'settlement-inputs-snapshot',
    onDemandPolicy: 'summary-only',
    dataClassification: 'WLT_READ_ONLY_REFERENCE',
    currentClosureStatus: 'blocked-by-wlt',
    currentEvidencePath: 'wlt/SERVICE_BLUEPRINT.md',
    notes: 'DSH emits operational candidates only. WLT accepts, rejects, reconciles, and accounts.',
  },
  {
    id: 'control-panel-operation',
    label: 'Control-panel operation record',
    entityKind: 'control-panel-operation-record',
    ownerSurface: 'control-panel',
    visibleSurfaces: ['control-panel'],
    lifecycleSource: 'dsh-control-panel-operation-record',
    allowedActions: ['define-operation-id', 'define-permission', 'define-input-validation', 'define-audit-log', 'define-rollback-hint'],
    forbiddenActions: ['add-route-per-small-action', 'implement-local-service-state-machine', 'hide-side-effect-classification'],
    requiredProof: ['audit-note'],
    auditRequired: true,
    rollbackRequired: true,
    rollbackHint: 'operator-review-required',
    ...boundary('none', 'NO_WLT_IMPACT'),
    controlPanelWorkspace: 'audit-rollback',
    onDemandPolicy: 'summary-only',
    dataClassification: 'RUNTIME_UNPROVEN',
    currentClosureStatus: 'registry-defined',
    currentEvidencePath: 'governance/19_CONTROL_PANEL_AND_OPERATING_MODEL.md',
    notes: 'Every control-panel action must declare operation_id, permission, input, validation, side effect, audit, rollback, and evidence.',
  },
];

function getDshOperationalRegistry(): readonly DshOperationalRegistryEntry[] {
  return DSH_OPERATIONAL_REGISTRY;
}

export function getDshOperationalEntryById(id: DshOperationalEntityId): DshOperationalRegistryEntry | undefined {
  return DSH_OPERATIONAL_REGISTRY.find((entry) => entry.id === id);
}

export function getDshOperationalEntriesBySurface(surfaceId: DshSurfaceId): readonly DshOperationalRegistryEntry[] {
  return DSH_OPERATIONAL_REGISTRY.filter(
    (entry) => entry.ownerSurface === surfaceId || entry.visibleSurfaces.includes(surfaceId),
  );
}

export function getDshOperationalEntriesByWorkspace(
  workspace: DshControlPanelOperationalWorkspace,
): readonly DshOperationalRegistryEntry[] {
  return DSH_OPERATIONAL_REGISTRY.filter((entry) => entry.controlPanelWorkspace === workspace);
}

function getDshOperationalEntriesWithWltImpact(): readonly DshOperationalRegistryEntry[] {
  return DSH_OPERATIONAL_REGISTRY.filter((entry) => entry.wltImpact !== 'none');
}

function assertDshDoesNotOwnFinancialMutation(entry: DshOperationalRegistryEntry): DshOperationalRegistryEntry {
  if (entry.noFinancialMutationInDsh !== true) {
    throw new Error(`DSH operational registry entry ${entry.id} is missing the no-financial-mutation marker.`);
  }

  if (
    entry.wltOwnershipBoundary === 'WLT_OWNS_FINAL_FINANCIAL_TRUTH' &&
    entry.wltImpact === 'wlt-owned-financial-truth'
  ) {
    throw new Error(`DSH operational registry entry ${entry.id} attempts to own final WLT financial truth.`);
  }

  return entry;
}

// ---------------------------------------------------------------------------
// DSH Shared Flow Registry
//
// Single canonical source of truth for every DSH flow's:
//   ownerSurface · visibleSurfaces · visibility · onDemandPolicy
//   escalationOwner · financialImpact · hiddenCompat · allowedActions · forbiddenActions
//
// Rules:
//  - Pure types + data only. No React, no side-effects, no backend, no mutation.
//  - Import from '@bthwani/ui-kit' is FORBIDDEN here; this file has zero UI deps.
//  - finance-snapshot flows: financialImpact=true, onDemandPolicy='finance-snapshot-only', NO mutation.
//  - hidden-compat flows: hiddenCompat=true, visibility='hidden-compat' — must NOT be rendered primary.
//
// Cross-surface ownership contract:
//  - app-client  : sees order/support only inside its own order context, never partner internals.
//  - app-partner : owns order lifecycle, inventory, partner-ops. No client/captain internals.
//  - app-captain : owns handoff/delivery flows. No partner internal issues beyond handoff.
//  - app-field   : owns onboarding, visit, readiness. No financial policies or decisions.
//  - control-panel: escalationOwner for all policy/SLA/support flows. No duplicate mobile screens.
//  - wlt-finance : reference-only for any financial snapshot. No DSH-initiated mutation.
// ---------------------------------------------------------------------------

export type DshFlowDomain =
  | 'order-lifecycle'
  | 'cart-checkout'
  | 'tracking'
  | 'delivery-mode'
  | 'partner-operations'
  | 'captain-operations'
  | 'field-onboarding'
  | 'catalog-inventory'
  | 'support-escalation'
  | 'chat-conversation'
  | 'cancellation-rejection'
  | 'finance-snapshot'
  | 'control-policy';

/**
 * primary        — primary nav / main action on ownerSurface.
 * contextual     — visible only when a related context (order, case) is open.
 * escalation-only— visible only in escalation/support queue flows.
 * hidden-compat  — legacy/alias; kept for backward compat; must NOT render as primary entry.
 * internal       — control-panel / ops-only; never shown in mobile surfaces.
 * disabled       — registered but not yet active in any surface.
 */
export type DshFlowVisibility =
  | 'primary'
  | 'contextual'
  | 'escalation-only'
  | 'hidden-compat'
  | 'internal'
  | 'disabled';

export type DshFlowRegistryEntry = {
  /** Stable flow identifier — matches IDs in dsh-partner.types.ts and screen-registry files. */
  readonly id: string;
  /** Human-readable label (Arabic / mixed where applicable). */
  readonly label: string;
  /** Flow domain classification. */
  readonly domain: DshFlowDomain;
  /** Surface that owns and drives this flow. */
  readonly ownerSurface: DshSurfaceId;
  /** All surfaces where this flow is visible (at any mode). */
  readonly visibleSurfaces: readonly DshSurfaceId[];
  /** Visibility mode on ownerSurface. */
  readonly visibility: DshFlowVisibility;
  /** Route ID hint (matches route union in surface types file). */
  readonly routeId?: string;
  /** Screen/panel hint for navigation. */
  readonly screenHint?: string;
  /** Surface responsible for escalation decisions (typically control-panel). */
  readonly escalationOwner?: DshSurfaceId;
  /** True when this flow has a financial snapshot/settlement/commission implication. */
  readonly financialImpact?: boolean;
  /** On-demand loading contract for this flow's data. */
  readonly onDemandPolicy: DshOnDemandPolicy;
  /** True when kept only for legacy registry consumer backward compat. Must not render primary. */
  readonly hiddenCompat?: boolean;
  /** Actions permitted on this flow. */
  readonly allowedActions: readonly string[];
  /** Actions explicitly forbidden. */
  readonly forbiddenActions: readonly string[];
  /** Notes on compat status, deprecation, or cross-surface constraints. */
  readonly notes?: string;
};

// ---------------------------------------------------------------------------
// Registry — Partner Operational Flows
// Note: registry also covers 2 legacy support-route aliases (auction-status-update,
// order-rejection) that exist in DSH_PARTNER_SUPPORT_ROUTE_IDS but NOT in
// DSH_PARTNER_OPERATIONAL_FLOW_IDS — they appear in PARTNER_HIDDEN_COMPAT_FLOWS.
// ---------------------------------------------------------------------------

const PARTNER_ORDER_LIFECYCLE: readonly DshFlowRegistryEntry[] = [
  {
    id: 'order-accept',
    label: 'قبول الطلب',
    domain: 'order-lifecycle',
    ownerSurface: 'app-partner',
    visibleSurfaces: ['app-partner', 'control-panel'],
    visibility: 'primary',
    routeId: 'order-accept',
    screenHint: 'PartnerSupportScreen > active-orders',
    escalationOwner: 'control-panel',
    onDemandPolicy: 'detail-on-open',
    allowedActions: ['قبول الطلب', 'مراجعة تفاصيل الطلب'],
    forbiddenActions: ['قبول طلب مكسور أو غير مكتمل', 'تعديل السعر'],
  },
  {
    id: 'order-get',
    label: 'استلام تفاصيل الطلب',
    domain: 'order-lifecycle',
    ownerSurface: 'app-partner',
    visibleSurfaces: ['app-partner'],
    visibility: 'primary',
    routeId: 'order-get',
    screenHint: 'OrdersInboxScreen',
    onDemandPolicy: 'detail-on-open',
    allowedActions: ['عرض تفاصيل الطلب'],
    forbiddenActions: ['تعديل بيانات الطلب الأصلية'],
  },
  {
    id: 'order-handoff',
    label: 'تسليم الطلب (Handoff)',
    domain: 'order-lifecycle',
    ownerSurface: 'app-partner',
    visibleSurfaces: ['app-partner', 'app-captain', 'control-panel'],
    visibility: 'primary',
    routeId: 'order-handoff',
    screenHint: 'PartnerSupportScreen',
    escalationOwner: 'control-panel',
    onDemandPolicy: 'detail-on-open',
    allowedActions: ['تثبيت handoff', 'تسليم الطلب للكابتن'],
    forbiddenActions: ['تأكيد handoff بدون وصول فعلي', 'تجاوز إثبات التسليم'],
  },
  {
    id: 'order-prepare',
    label: 'تحضير الطلب',
    domain: 'order-lifecycle',
    ownerSurface: 'app-partner',
    visibleSurfaces: ['app-partner', 'control-panel'],
    visibility: 'primary',
    routeId: 'order-prepare',
    screenHint: 'PartnerSupportScreen > active-orders',
    escalationOwner: 'control-panel',
    onDemandPolicy: 'detail-on-open',
    allowedActions: ['بدء التحضير', 'تحديث وقت التحضير', 'الإبلاغ عن عنصر ناقص'],
    forbiddenActions: ['إعلان الجاهزية مع بقاء النقص', 'تعديل السعر'],
  },
  {
    id: 'order-ready',
    label: 'الطلب جاهز للاستلام',
    domain: 'order-lifecycle',
    ownerSurface: 'app-partner',
    visibleSurfaces: ['app-partner', 'app-captain', 'control-panel'],
    visibility: 'primary',
    routeId: 'order-ready',
    escalationOwner: 'control-panel',
    onDemandPolicy: 'detail-on-open',
    allowedActions: ['تثبيت الجاهزية', 'إشعار الكابتن'],
    forbiddenActions: ['إعلان جاهزية طلب ناقص'],
  },
  {
    id: 'order-out-for-delivery',
    label: 'الطلب في الطريق للتوصيل',
    domain: 'tracking',
    ownerSurface: 'app-captain',
    visibleSurfaces: ['app-partner', 'app-captain', 'app-client', 'control-panel'],
    visibility: 'contextual',
    routeId: 'order-out-for-delivery',
    escalationOwner: 'control-panel',
    onDemandPolicy: 'summary-only',
    allowedActions: ['متابعة حالة التوصيل'],
    forbiddenActions: ['تعديل مسار التوصيل من الشريك'],
    notes: 'الملكية التشغيلية للكابتن؛ يظهر للشريك كحالة مرجعية فقط.',
  },
  {
    id: 'order-store-delivered',
    label: 'تأكيد التسليم في الفرع',
    domain: 'order-lifecycle',
    ownerSurface: 'app-partner',
    visibleSurfaces: ['app-partner', 'control-panel'],
    visibility: 'primary',
    routeId: 'order-store-delivered',
    escalationOwner: 'control-panel',
    onDemandPolicy: 'detail-on-open',
    allowedActions: ['تأكيد الاستلام', 'طلب إثبات تسليم'],
    forbiddenActions: ['إغلاق الطلب بدون إثبات عند الطلب'],
  },
  {
    id: 'order-reject',
    label: 'رفض الطلب',
    domain: 'cancellation-rejection',
    ownerSurface: 'app-partner',
    visibleSurfaces: ['app-partner', 'control-panel'],
    visibility: 'primary',
    routeId: 'order-reject',
    screenHint: 'PartnerSupportScreen > active-orders',
    escalationOwner: 'control-panel',
    onDemandPolicy: 'evidence-on-open',
    allowedActions: ['فتح مسار الرفض', 'تسجيل السبب', 'طلب مراجعة تشغيلية'],
    forbiddenActions: ['رفض بلا سبب', 'تحويل الرفض إلى تعويض مالي محلي'],
    notes: 'قرار استثنائي — يتطلب سببًا تشغيليًا صريحًا.',
  },
  {
    id: 'order-issue-queue',
    label: 'صف مشاكل الطلبات',
    domain: 'support-escalation',
    ownerSurface: 'app-partner',
    visibleSurfaces: ['app-partner', 'control-panel'],
    visibility: 'primary',
    routeId: 'order-issue-queue',
    screenHint: 'PartnerSupportScreen > order-issues',
    escalationOwner: 'control-panel',
    onDemandPolicy: 'detail-on-open',
    allowedActions: ['فتح حالة مشكلة', 'تحديث حالة الطلب', 'تصعيد للدعم'],
    forbiddenActions: ['إغلاق الحالة دون قرار', 'إنشاء تعويض محلي'],
  },
];

const PARTNER_HIDDEN_COMPAT_FLOWS: readonly DshFlowRegistryEntry[] = [
  {
    id: 'order-alerts',
    label: 'تنبيهات الطلب',
    domain: 'order-lifecycle',
    ownerSurface: 'app-partner',
    visibleSurfaces: ['app-partner'],
    visibility: 'hidden-compat',
    hiddenCompat: true,
    onDemandPolicy: 'summary-only',
    allowedActions: ['الاحتفاظ بالتوافق للمستهلكين القدامى'],
    forbiddenActions: ['عرضه كخيار أساسي', 'إنشاء navigation route مستقل'],
    notes: 'مضمّن في command center؛ لا يظهر كمسار مستقل.',
  },
  {
    id: 'order-sla-risk',
    label: 'خطر SLA',
    domain: 'support-escalation',
    ownerSurface: 'app-partner',
    visibleSurfaces: ['app-partner', 'control-panel'],
    visibility: 'hidden-compat',
    hiddenCompat: true,
    escalationOwner: 'control-panel',
    onDemandPolicy: 'summary-only',
    allowedActions: ['تمييز الحالة كخطر SLA', 'الاحتفاظ بالتوافق'],
    forbiddenActions: ['عرضه كمدخل أساسي منفصل'],
    notes: 'مضمّن داخل حالات command center؛ التصعيد يذهب لـ control-panel.',
  },
  {
    id: 'order-issue-required',
    label: 'تقرير مشكلة إلزامي',
    domain: 'support-escalation',
    ownerSurface: 'app-partner',
    visibleSurfaces: ['app-partner'],
    visibility: 'hidden-compat',
    hiddenCompat: true,
    onDemandPolicy: 'detail-on-open',
    allowedActions: ['الاحتفاظ بالتوافق'],
    forbiddenActions: ['إظهاره كخيار ابتدائي'],
    notes: 'استخدم order-issue-queue بدلًا منه للتدفقات الجديدة.',
  },
  {
    id: 'auction-status-update',
    label: 'Auction Status Update (Legacy)',
    domain: 'order-lifecycle',
    ownerSurface: 'app-partner',
    visibleSurfaces: ['app-partner'],
    visibility: 'hidden-compat',
    hiddenCompat: true,
    onDemandPolicy: 'summary-only',
    allowedActions: ['الاحتفاظ بالتوافق للمستهلكين القدامى'],
    forbiddenActions: ['إظهاره كخيار أساسي', 'إنشاء route مستقل جديد'],
    notes: 'Legacy registry consumer only. See operations-support.snapshot.ts for detail.',
  },
  {
    id: 'order-rejection',
    label: 'Order Rejection (Legacy Route)',
    domain: 'cancellation-rejection',
    ownerSurface: 'app-partner',
    visibleSurfaces: ['app-partner'],
    visibility: 'hidden-compat',
    hiddenCompat: true,
    onDemandPolicy: 'summary-only',
    allowedActions: ['الاحتفاظ بالتوافق'],
    forbiddenActions: ['عرضه كصفحة أساسية منفصلة'],
    notes: 'Legacy alias. استخدم order-reject (flow) أو partner-reject-request (support) بدلًا منه.',
  },
];

const PARTNER_CHAT_FLOWS: readonly DshFlowRegistryEntry[] = [
  {
    id: 'order-chat-send',
    label: 'إرسال رسالة في المحادثة',
    domain: 'chat-conversation',
    ownerSurface: 'app-partner',
    visibleSurfaces: ['app-partner', 'app-client', 'app-captain'],
    visibility: 'contextual',
    routeId: 'chat-send',
    escalationOwner: 'control-panel',
    onDemandPolicy: 'chat-on-open',
    allowedActions: ['إرسال رسالة نصية', 'إرفاق صورة'],
    forbiddenActions: ['إرسال بيانات مالية أو تعويض عبر المحادثة'],
  },
  {
    id: 'order-chat-read-ack',
    label: 'تأكيد قراءة المحادثة',
    domain: 'chat-conversation',
    ownerSurface: 'app-partner',
    visibleSurfaces: ['app-partner'],
    visibility: 'contextual',
    routeId: 'chat-read-ack',
    onDemandPolicy: 'chat-on-open',
    allowedActions: ['تأكيد القراءة'],
    forbiddenActions: ['إرسال أي بيانات إضافية'],
  },
  {
    id: 'order-quick-reply-config',
    label: 'إعداد الردود السريعة',
    domain: 'chat-conversation',
    ownerSurface: 'app-partner',
    visibleSurfaces: ['app-partner'],
    visibility: 'contextual',
    routeId: 'quick-reply-config',
    screenHint: 'OperationScreens > ConversationScreen',
    onDemandPolicy: 'detail-on-open',
    allowedActions: ['إعداد الردود السريعة', 'تحرير القالب'],
    forbiddenActions: ['تضمين بيانات ثقيلة في state دائمًا'],
  },
  {
    id: 'order-quick-reply-settings',
    label: 'إعدادات الردود السريعة',
    domain: 'chat-conversation',
    ownerSurface: 'app-partner',
    visibleSurfaces: ['app-partner'],
    visibility: 'contextual',
    routeId: 'quick-reply-settings',
    onDemandPolicy: 'detail-on-open',
    allowedActions: ['تعديل الإعدادات'],
    forbiddenActions: ['تحميل جميع القوالب دائمًا دون فتح'],
  },
  {
    id: 'order-quick-reply-setup',
    label: 'إعداد أولي للردود السريعة',
    domain: 'chat-conversation',
    ownerSurface: 'app-partner',
    visibleSurfaces: ['app-partner'],
    visibility: 'contextual',
    routeId: 'quick-reply-setup',
    onDemandPolicy: 'detail-on-open',
    allowedActions: ['إعداد أولي للقوالب'],
    forbiddenActions: ['تحميل كل القوالب مسبقًا'],
  },
];

const PARTNER_INVENTORY_FLOWS: readonly DshFlowRegistryEntry[] = [
  {
    id: 'inventory-adjust',
    label: 'تعديل المخزون',
    domain: 'catalog-inventory',
    ownerSurface: 'app-partner',
    visibleSurfaces: ['app-partner', 'app-field', 'control-panel'],
    visibility: 'primary',
    routeId: 'inventory-adjust',
    screenHint: 'PartnerCatalogManagementScreen',
    escalationOwner: 'control-panel',
    onDemandPolicy: 'detail-on-open',
    allowedActions: ['تعديل الكميات', 'إيقاف مؤقت لعنصر', 'اقتراح بديل'],
    forbiddenActions: ['تعديل أسعار نهائية دون صلاحية', 'نشر منتج غير متحقق'],
  },
  {
    id: 'inventory-update',
    label: 'تحديث المخزون',
    domain: 'catalog-inventory',
    ownerSurface: 'app-partner',
    visibleSurfaces: ['app-partner', 'control-panel'],
    visibility: 'primary',
    routeId: 'inventory-update',
    escalationOwner: 'control-panel',
    onDemandPolicy: 'detail-on-open',
    allowedActions: ['تحديث بيانات المخزون'],
    forbiddenActions: ['نشر بيانات غير متحققة'],
  },
  {
    id: 'items-upsert',
    label: 'إضافة / تحديث عنصر',
    domain: 'catalog-inventory',
    ownerSurface: 'app-partner',
    visibleSurfaces: ['app-partner', 'control-panel'],
    visibility: 'primary',
    routeId: 'items-upsert',
    escalationOwner: 'control-panel',
    onDemandPolicy: 'detail-on-open',
    allowedActions: ['إضافة عنصر', 'تحديث بيانات العنصر'],
    forbiddenActions: ['نشر عنصر بدون مراجعة الكتالوج'],
  },
];

const PARTNER_ONBOARDING_FLOWS: readonly DshFlowRegistryEntry[] = [
  {
    id: 'doc-upload',
    label: 'رفع وثيقة',
    domain: 'partner-operations',
    ownerSurface: 'app-partner',
    visibleSurfaces: ['app-partner', 'control-panel'],
    visibility: 'primary',
    routeId: 'doc-upload',
    escalationOwner: 'control-panel',
    onDemandPolicy: 'evidence-on-open',
    allowedActions: ['رفع وثيقة', 'إرفاق مرجع'],
    forbiddenActions: ['تضمين ملفات ثقيلة في state دائمًا'],
  },
  {
    id: 'intake-start',
    label: 'بدء الإدخال',
    domain: 'partner-operations',
    ownerSurface: 'app-partner',
    visibleSurfaces: ['app-partner', 'control-panel'],
    visibility: 'primary',
    routeId: 'intake-start',
    escalationOwner: 'control-panel',
    onDemandPolicy: 'detail-on-open',
    allowedActions: ['بدء ملف الإدخال', 'حفظ مسودة'],
    forbiddenActions: ['التفعيل النهائي دون مراجعة'],
  },
  {
    id: 'store-nomination',
    label: 'ترشيح متجر',
    domain: 'partner-operations',
    ownerSurface: 'app-partner',
    visibleSurfaces: ['app-partner', 'app-field', 'control-panel'],
    visibility: 'primary',
    routeId: 'store-nomination',
    escalationOwner: 'control-panel',
    onDemandPolicy: 'detail-on-open',
    allowedActions: ['رفع بيانات الترشيح', 'تحويل للمراجعة'],
    forbiddenActions: ['إسناد أثر مالي محلي', 'تفعيل دون مراجعة'],
  },
  {
    id: 'video-upload',
    label: 'رفع مقطع فيديو',
    domain: 'partner-operations',
    ownerSurface: 'app-partner',
    visibleSurfaces: ['app-partner', 'control-panel'],
    visibility: 'primary',
    routeId: 'video-upload',
    screenHint: 'OperationScreens > VideoUploadScreen',
    escalationOwner: 'control-panel',
    onDemandPolicy: 'evidence-on-open',
    allowedActions: ['رفع مقطع', 'مراجعة قبل الإرسال'],
    forbiddenActions: ['تضمين ملف الفيديو في state دائمًا'],
  },
];

// ---------------------------------------------------------------------------
// Registry — Finance Snapshot Flows (WLT bridge, hidden-compat on partner)
// ---------------------------------------------------------------------------

const FINANCE_SNAPSHOT_FLOWS: readonly DshFlowRegistryEntry[] = [
  {
    id: 'partner-finance-bridge',
    label: 'جسر المعلومات المالية للشريك',
    domain: 'finance-snapshot',
    ownerSurface: 'wlt-finance',
    visibleSurfaces: ['app-partner', 'control-panel', 'wlt-finance'],
    visibility: 'hidden-compat',
    hiddenCompat: true,
    financialImpact: true,
    escalationOwner: 'control-panel',
    onDemandPolicy: 'finance-snapshot-only',
    allowedActions: ['عرض ملخص مالي للقراءة فقط'],
    forbiddenActions: ['بدء استرداد', 'تعديل تسوية', 'تغيير عمولة أو ledger', 'mutation مالي من DSH'],
    notes: 'WLT هو المالك الوحيد لأي أثر مالي. يظهر للشريك كـ snapshot tag فقط.',
  },
  {
    id: 'partner-settlement-summary',
    label: 'ملخص التسوية',
    domain: 'finance-snapshot',
    ownerSurface: 'wlt-finance',
    visibleSurfaces: ['app-partner', 'control-panel', 'wlt-finance'],
    visibility: 'hidden-compat',
    hiddenCompat: true,
    financialImpact: true,
    escalationOwner: 'control-panel',
    onDemandPolicy: 'finance-snapshot-only',
    allowedActions: ['عرض ملخص التسوية للقراءة فقط'],
    forbiddenActions: ['تعديل التسوية', 'إنشاء استرداد', 'mutation مالي من DSH'],
    notes: 'يبقى snapshot-only. أي mutation يذهب لـ WLT فقط.',
  },
  {
    id: 'partner-commission-summary',
    label: 'ملخص العمولة',
    domain: 'finance-snapshot',
    ownerSurface: 'wlt-finance',
    visibleSurfaces: ['app-partner', 'control-panel', 'wlt-finance'],
    visibility: 'hidden-compat',
    hiddenCompat: true,
    financialImpact: true,
    escalationOwner: 'control-panel',
    onDemandPolicy: 'finance-snapshot-only',
    allowedActions: ['عرض ملخص العمولة للقراءة فقط'],
    forbiddenActions: ['تعديل العمولة', 'تغيير ledger', 'mutation مالي من DSH'],
    notes: 'يبقى snapshot-only. أي mutation يذهب لـ WLT فقط.',
  },
];

// ---------------------------------------------------------------------------
// Registry — Client Flows (summary-level; full registry in Phase 2+)
// ---------------------------------------------------------------------------

const CLIENT_FLOWS: readonly DshFlowRegistryEntry[] = [
  {
    id: 'client-order-tracking',
    label: 'تتبع الطلب',
    domain: 'tracking',
    ownerSurface: 'app-client',
    visibleSurfaces: ['app-client'],
    visibility: 'primary',
    routeId: 'tracking',
    screenHint: 'OrdersTrackingScreens',
    onDemandPolicy: 'summary-only',
    allowedActions: ['عرض حالة الطلب', 'تتبع الموقع'],
    forbiddenActions: ['تعديل بيانات الطلب', 'رؤية منطق الشريك الداخلي'],
    notes: 'تفاصيل إضافية مؤجلة لمرحلة الإثراء التالية.',
  },
  {
    id: 'client-cart-checkout',
    label: 'عربة التسوق / الدفع',
    domain: 'cart-checkout',
    ownerSurface: 'app-client',
    visibleSurfaces: ['app-client'],
    visibility: 'primary',
    routeId: 'cart',
    screenHint: 'CartScreen',
    onDemandPolicy: 'detail-on-open',
    allowedActions: ['إضافة للعربة', 'إتمام الطلب'],
    forbiddenActions: ['تعديل أسعار المتجر', 'رؤية بيانات الكابتن'],
    notes: 'مراجعة on-demand retrieval مؤجلة لمرحلة الإثراء التالية.',
  },
  {
    id: 'client-order-issue',
    label: 'الإبلاغ عن مشكلة في الطلب',
    domain: 'support-escalation',
    ownerSurface: 'app-client',
    visibleSurfaces: ['app-client', 'control-panel'],
    visibility: 'contextual',
    routeId: 'order-issue-workspace',
    escalationOwner: 'control-panel',
    onDemandPolicy: 'evidence-on-open',
    allowedActions: ['الإبلاغ عن مشكلة', 'طلب المساعدة'],
    forbiddenActions: ['رؤية منطق الشريك الداخلي', 'بدء استرداد مباشر'],
  },
];

// ---------------------------------------------------------------------------
// Registry — Captain Flows (summary-level; full registry in Phase 2+)
// ---------------------------------------------------------------------------

const CAPTAIN_FLOWS: readonly DshFlowRegistryEntry[] = [
  {
    id: 'captain-order-pickup',
    label: 'استلام الطلب (Pickup)',
    domain: 'captain-operations',
    ownerSurface: 'app-captain',
    visibleSurfaces: ['app-captain', 'control-panel'],
    visibility: 'primary',
    routeId: 'pickup-dropoff',
    screenHint: 'DshCaptainPickupDropoffScreen',
    escalationOwner: 'control-panel',
    onDemandPolicy: 'detail-on-open',
    allowedActions: ['تأكيد الوصول للفرع', 'طلب handoff', 'تصعيد التأخير'],
    forbiddenActions: ['تأكيد الاستلام قبل الوصول', 'رؤية مشاكل الشريك الداخلية'],
    notes: 'تفاصيل إضافية مؤجلة لمرحلة الإثراء التالية.',
  },
  {
    id: 'captain-proof-of-delivery',
    label: 'إثبات التسليم',
    domain: 'captain-operations',
    ownerSurface: 'app-captain',
    visibleSurfaces: ['app-captain', 'control-panel'],
    visibility: 'primary',
    routeId: 'pod-submission',
    screenHint: 'DshCaptainPoDSubmissionScreen',
    escalationOwner: 'control-panel',
    onDemandPolicy: 'evidence-on-open',
    allowedActions: ['رفع إثبات التسليم', 'طلب إعادة محاولة'],
    forbiddenActions: ['إغلاق التسليم بدون إثبات عند الطلب', 'تضمين صور ثقيلة دائمًا'],
  },
  {
    id: 'captain-map-navigation',
    label: 'خريطة التوصيل',
    domain: 'tracking',
    ownerSurface: 'app-captain',
    visibleSurfaces: ['app-captain'],
    visibility: 'primary',
    routeId: 'map',
    screenHint: 'DshCaptainMapScreen',
    onDemandPolicy: 'summary-only',
    allowedActions: ['متابعة المسار', 'تحديث الموقع'],
    forbiddenActions: ['تضمين payload ثقيل في state دائمًا'],
    notes: 'مراجعة on-demand retrieval مؤجلة لمرحلة الإثراء التالية.',
  },
];

// ---------------------------------------------------------------------------
// Registry — Field Flows (summary-level; full registry in Phase 2+)
// ---------------------------------------------------------------------------

const FIELD_FLOWS: readonly DshFlowRegistryEntry[] = [
  {
    id: 'field-store-onboarding',
    label: 'تأهل متجر جديد',
    domain: 'field-onboarding',
    ownerSurface: 'app-field',
    visibleSurfaces: ['app-field', 'control-panel'],
    visibility: 'primary',
    routeId: 'onboarding',
    screenHint: 'DshFieldStoreOnboardingScreen',
    escalationOwner: 'control-panel',
    onDemandPolicy: 'detail-on-open',
    allowedActions: ['استكمال ملف التأهيل', 'رفع الوثائق', 'تحويل للمراجعة'],
    forbiddenActions: ['التفعيل النهائي دون مراجعة', 'ربط settlement محلي'],
    notes: 'تفاصيل إضافية مؤجلة لمرحلة الإثراء التالية.',
  },
  {
    id: 'field-store-visit',
    label: 'زيارة الفرع',
    domain: 'field-onboarding',
    ownerSurface: 'app-field',
    visibleSurfaces: ['app-field', 'control-panel'],
    visibility: 'primary',
    routeId: 'visit',
    screenHint: 'DshFieldStoreVisitScreen',
    escalationOwner: 'control-panel',
    onDemandPolicy: 'evidence-on-open',
    allowedActions: ['تسجيل الزيارة', 'إرفاق دليل ميداني'],
    forbiddenActions: ['إغلاق الحالة بلا دليل عند طلبه', 'تحميل صور ثقيلة دائمًا'],
  },
  {
    id: 'field-readiness-escalation',
    label: 'تصعيد جاهزية الفرع',
    domain: 'support-escalation',
    ownerSurface: 'app-field',
    visibleSurfaces: ['app-field', 'control-panel'],
    visibility: 'primary',
    routeId: 'readiness-escalation',
    screenHint: 'DshFieldReadinessEscalationScreen',
    escalationOwner: 'control-panel',
    onDemandPolicy: 'evidence-on-open',
    allowedActions: ['رفع بلاغ جاهزية', 'تجميع النواقص', 'تحويل للوحة التحكم'],
    forbiddenActions: ['تفعيل الفرع رغم النواقص', 'ربط settlement محلي'],
  },
];

// ---------------------------------------------------------------------------
// Registry — Control-Panel Flows (summary-level ownership anchors)
// ---------------------------------------------------------------------------

const CONTROL_PANEL_FLOWS: readonly DshFlowRegistryEntry[] = [
  {
    id: 'control-sla-policy',
    label: 'سياسة SLA',
    domain: 'control-policy',
    ownerSurface: 'control-panel',
    visibleSurfaces: ['control-panel'],
    visibility: 'internal',
    screenHint: 'operations/AuditSupportSlaScreen',
    onDemandPolicy: 'detail-on-open',
    allowedActions: ['مراجعة السياسة', 'تعديل حدود SLA'],
    forbiddenActions: ['تكرار شاشات الموبايل', 'mutation مالي مباشر'],
    notes: 'control-panel هو المالك الوحيد لسياسات SLA والتصعيد.',
  },
  {
    id: 'control-escalation-queue',
    label: 'صف التصعيد',
    domain: 'support-escalation',
    ownerSurface: 'control-panel',
    visibleSurfaces: ['control-panel'],
    visibility: 'primary',
    screenHint: 'operations/ExceptionsEscalationsScreen',
    onDemandPolicy: 'detail-on-open',
    allowedActions: ['مراجعة الحالات المصعّدة', 'اتخاذ قرار السياسة'],
    forbiddenActions: ['تكرار شاشات الموبايل', 'mutation مالي بدون WLT'],
  },
  {
    id: 'customer-360',
    label: 'Customer 360',
    domain: 'support-escalation',
    ownerSurface: 'control-panel',
    visibleSurfaces: ['control-panel'],
    visibility: 'primary',
    screenHint: 'support/Customer360Workspace',
    escalationOwner: 'control-panel',
    onDemandPolicy: 'detail-on-open',
    allowedActions: ['فتح الطلب أو التذكرة', 'فتح Assisted Order', 'فتح Order Rescue', 'فتح WLT visibility'],
    forbiddenActions: ['كشف بيانات حساسة بلا تحقق', 'بدء refund أو settlement محلي', 'تكرار شاشات العميل'],
    notes: 'مركز دعم سياقي موحّد للطلب والتذكرة والرؤية المرجعية.',
  },
  {
    id: 'manual-call-intake',
    label: 'Manual Call Intake',
    domain: 'support-escalation',
    ownerSurface: 'control-panel',
    visibleSurfaces: ['control-panel'],
    visibility: 'primary',
    screenHint: 'support/ManualCallIntakeWorkspace',
    escalationOwner: 'control-panel',
    onDemandPolicy: 'detail-on-open',
    allowedActions: ['تثبيت source = external_phone_manual', 'بدء التحقق من الهوية', 'التحويل إلى Customer 360 أو Assisted Order'],
    forbiddenActions: ['إظهار الحقول الحساسة قبل التحقق', 'بدء money mutation', 'تحويل المكالمة إلى workflow عام بلا source'],
    notes: 'أي تفاصيل حساسة أو مالية تبقى محجوبة حتى اكتمال التحقق.',
  },
  {
    id: 'assisted-order-desk',
    label: 'Assisted Order Desk',
    domain: 'support-escalation',
    ownerSurface: 'control-panel',
    visibleSurfaces: ['control-panel'],
    visibility: 'primary',
    screenHint: 'operations/AssistedOrderDeskScreen',
    escalationOwner: 'control-panel',
    onDemandPolicy: 'detail-on-open',
    allowedActions: ['إعادة بناء السلة', 'تثبيت البديل', 'فتح WLT visibility المرجعية', 'تحويل الحالة إلى Order Rescue'],
    forbiddenActions: ['إرسال الطلب بلا تحقق أو handoff', 'بدء refund محلي', 'حل نزاعات الشريك من داخل العمليات'],
    notes: 'workspace تشغيلي بين support وpartner flow قبل التصعيد الكامل.',
  },
  {
    id: 'order-rescue',
    label: 'Order Rescue',
    domain: 'support-escalation',
    ownerSurface: 'control-panel',
    visibleSurfaces: ['control-panel'],
    visibility: 'primary',
    screenHint: 'operations/OrderRescueScreen',
    escalationOwner: 'control-panel',
    onDemandPolicy: 'detail-on-open',
    allowedActions: ['تحديد blocker واحد', 'فتح ticket أو partner controls أو WLT reference', 'تثبيت next-best-action'],
    forbiddenActions: ['إطلاق money mutation', 'تكرار نفس القرار عبر أكثر من owner', 'إغلاق rescue بلا blocker واضح'],
    notes: 'Workspace إنقاذ متعدد الأسطح مع رؤية WLT للقراءة فقط عند الحاجة.',
  },
  {
    id: 'ops-intervention-playbook',
    label: 'Ops Intervention Playbook',
    domain: 'control-policy',
    ownerSurface: 'control-panel',
    visibleSurfaces: ['control-panel'],
    visibility: 'internal',
    screenHint: 'operations/CommandCenter + ExceptionsEscalations',
    escalationOwner: 'control-panel',
    onDemandPolicy: 'summary-only',
    allowedActions: ['عرض next-best-action', 'فتح owner section الصحيح', 'تجميع checkpoints بسرعة'],
    forbiddenActions: ['تحويل playbook إلى workflow تنفيذي مستقل', 'إخفاء WLT boundary'],
    notes: 'مرجع قرار سريع مدمج داخل command center والاستثناءات.',
  },
];

// ---------------------------------------------------------------------------
// Master registry — combine all domains
// ---------------------------------------------------------------------------

export const DSH_FLOW_REGISTRY: readonly DshFlowRegistryEntry[] = [
  ...PARTNER_ORDER_LIFECYCLE,
  ...PARTNER_HIDDEN_COMPAT_FLOWS,
  ...PARTNER_CHAT_FLOWS,
  ...PARTNER_INVENTORY_FLOWS,
  ...PARTNER_ONBOARDING_FLOWS,
  ...FINANCE_SNAPSHOT_FLOWS,
  ...CLIENT_FLOWS,
  ...CAPTAIN_FLOWS,
  ...FIELD_FLOWS,
  ...CONTROL_PANEL_FLOWS,
] as const;

// ---------------------------------------------------------------------------
// Utility functions — no side effects
// ---------------------------------------------------------------------------

/** Lookup a registry entry by its stable flow ID. */
export function getDshFlowById(id: string): DshFlowRegistryEntry | undefined {
  return DSH_FLOW_REGISTRY.find((entry) => entry.id === id);
}

/**
 * All registry entries that are visible on a given surface
 * (owns, or listed in visibleSurfaces — including hidden-compat).
 */
export function getDshFlowsForSurface(surfaceId: DshSurfaceId): readonly DshFlowRegistryEntry[] {
  return DSH_FLOW_REGISTRY.filter(
    (entry) =>
      entry.ownerSurface === surfaceId || entry.visibleSurfaces.includes(surfaceId)
  );
}

/**
 * Entries that can render in a visible workspace for a surface.
 * Excludes hidden-compat and disabled everywhere, and excludes internal
 * outside control-panel. Pure read-only filter — no side effects, no throws.
 */
export function getDshRenderableFlowsForSurface(surfaceId: DshSurfaceId): readonly DshFlowRegistryEntry[] {
  return getDshFlowsForSurface(surfaceId).filter((entry) => {
    if (entry.visibility === 'hidden-compat' || entry.visibility === 'disabled') {
      return false;
    }

    if (entry.visibility === 'internal' && surfaceId !== 'control-panel') {
      return false;
    }

    return true;
  });
}

/** True when a flow ID is a legacy/hidden-compat entry that must NOT render primary. */
export function isDshHiddenCompatFlow(id: string): boolean {
  const entry = getDshFlowById(id);
  return entry?.hiddenCompat === true;
}

/**
 * All flows that require escalation handling (have an escalationOwner defined).
 * Useful for control-panel escalation queue wiring.
 */
export function getDshEscalationFlows(): readonly DshFlowRegistryEntry[] {
  return DSH_FLOW_REGISTRY.filter((entry) => entry.escalationOwner !== undefined);
}

/**
 * Escalation-aware flows relevant to a given surface.
 * Includes flows owned by the surface, visible on the surface, or escalated to it.
 * Pure read-only filter — no side effects, no throws.
 */
export function getDshEscalationFlowsForSurface(surfaceId: DshSurfaceId): readonly DshFlowRegistryEntry[] {
  return getDshEscalationFlows().filter(
    (entry) =>
      entry.ownerSurface === surfaceId ||
      entry.visibleSurfaces.includes(surfaceId) ||
      entry.escalationOwner === surfaceId,
  );
}

/**
 * All flows with financialImpact=true.
 * These must remain finance-snapshot-only — no mutation from DSH.
 */
export function getDshFinanceImpactFlows(): readonly DshFlowRegistryEntry[] {
  return DSH_FLOW_REGISTRY.filter((entry) => entry.financialImpact === true);
}

export type DshFlowPolicySummary = {
  readonly flowId: string;
  readonly ownerSurface: DshSurfaceId;
  readonly visibleSurfaces: readonly DshSurfaceId[];
  readonly domain: DshFlowDomain;
  readonly visibility: DshFlowVisibility;
  readonly onDemandPolicy: DshOnDemandPolicy;
  readonly escalationOwner?: DshSurfaceId | undefined;
  readonly financialImpact: boolean;
  readonly hiddenCompat: boolean;
  readonly allowedActions: readonly string[];
  readonly forbiddenActions: readonly string[];
  readonly nextPolicyActionPreview: string;
};

function resolveNextPolicyActionPreview(onDemandPolicy: DshOnDemandPolicy): string {
  if (onDemandPolicy === 'summary-only') {
    return 'اعرض الملخص أولاً، وافتح التفاصيل فقط عند طلب المستخدم.';
  }

  if (onDemandPolicy === 'detail-on-open') {
    return 'افتح التفاصيل عند اختيار هذا المسار، ولا تحملها مسبقًا.';
  }

  if (onDemandPolicy === 'evidence-on-open') {
    return 'افتح الأدلة أو الصور فقط من داخل السياق وعند الطلب.';
  }

  if (onDemandPolicy === 'chat-on-open') {
    return 'افتح المحادثة فقط عند اختيار فتح الدردشة من داخل الطلب.';
  }

  return 'اعرض المعاينة المالية للقراءة فقط من دون أي تنفيذ أو تعديل.';
}

/**
 * Compact read-only policy snapshot for a single flow.
 * Safe for render paths; no throws and no heavy payloads.
 */
export function getDshFlowPolicySummary(flowId: string): DshFlowPolicySummary | undefined {
  const entry = getDshFlowById(flowId);
  if (!entry) {
    return undefined;
  }

  return {
    flowId: entry.id,
    ownerSurface: entry.ownerSurface,
    visibleSurfaces: entry.visibleSurfaces,
    domain: entry.domain,
    visibility: entry.visibility,
    onDemandPolicy: entry.onDemandPolicy,
    escalationOwner: entry.escalationOwner,
    financialImpact: entry.financialImpact === true,
    hiddenCompat: entry.hiddenCompat === true,
    allowedActions: entry.allowedActions,
    forbiddenActions: entry.forbiddenActions,
    nextPolicyActionPreview: resolveNextPolicyActionPreview(entry.onDemandPolicy),
  };
}

/**
 * Translates a DshOnDemandPolicy value to a human-readable Arabic label.
 * Centralizes the label map that was previously duplicated in
 * SupportEscalationQueueScreen, SupportDashboardScreen, DshFieldReadinessEscalationScreen,
 * DshFieldStoreOnboardingScreen, and similar screens.
 */
export function resolveDshOnDemandPolicyLabel(policy?: string): string {
  if (policy === 'detail-on-open') return 'تفاصيل عند الفتح';
  if (policy === 'evidence-on-open') return 'أدلة عند الفتح';
  if (policy === 'chat-on-open') return 'محادثة عند الفتح';
  if (policy === 'finance-snapshot-only') return 'مالي للقراءة فقط';
  if (policy === 'summary-only') return 'ملخص أولًا';
  return policy ?? 'سياسة من السجل';
}
