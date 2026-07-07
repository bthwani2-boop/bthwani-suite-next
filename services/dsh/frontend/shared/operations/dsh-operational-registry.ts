import type { DshOnDemandPolicy, DshSurfaceId } from '../runtime/dsh-flow-registry';
import type {
  DshControlPanelOperationalWorkspace,
  DshOperationalAuditPolicy,
  DshOperationalBoundaryPolicy,
  DshOperationalClosureStatus,
  DshOperationalDataClassification,
  DshOperationalEntityId,
  DshOperationalEntityKind,
  DshOperationalProofRequirement,
  DshOperationalWltImpact,
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
