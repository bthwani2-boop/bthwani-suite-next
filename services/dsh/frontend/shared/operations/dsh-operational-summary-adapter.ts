import type { DshOperationalEntityId } from './dsh-operational.contract';
import {
  getDshOperationalEntriesBySurface,
  getDshOperationalEntriesByWorkspace,
  getDshOperationalEntryById,
} from './dsh-operational-registry';
import type { DshSurfaceId } from './dsh-operational.contract';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DshOperationalSummaryRecord = Record<string, any>;
const dshOperationalSummaryRecords: readonly DshOperationalSummaryRecord[] = [];

const dshOperationalSummaryAdapterMeta = {
  dataKind: 'SCAFFOLD_ADAPTER',
  runtimeTruth: false,
  backendSource: false,
  bindingSource: false,
  sourceDataOwner: 'api-runtime/operational',
  adapterOwner: 'dsh/frontend/shared/dsh-operational-summary-adapter.ts',
} as const;

export type DshOperationalSurfaceSummary = {
  readonly summaryId: string;
  readonly registryEntryId: DshOperationalEntityId;
  readonly label: string;
  readonly summary: string;
  readonly ownerSurface: DshSurfaceId;
  readonly status: DshOperationalSummaryRecord['status'];
  readonly controlPanelWorkspace: DshOperationalSummaryRecord['controlPanelWorkspace'];
  readonly dataClassification: DshOperationalSummaryRecord['dataClassification'];
  readonly detailRef: string;
  readonly evidenceRef?: string;
  readonly wltImpact: DshOperationalSummaryRecord['wltImpact'];
  readonly runtimeTruth: false;
  readonly backendSource: false;
  readonly bindingSource: false;
};

export type DshControlPanelOperationsSummary = {
  readonly workspace: DshOperationalSummaryRecord['controlPanelWorkspace'];
  readonly purpose: string;
  readonly records: readonly DshOperationalSurfaceSummary[];
};

function toSummary(record: DshOperationalSummaryRecord): DshOperationalSurfaceSummary {
  return {
    summaryId: record.recordId,
    registryEntryId: record.registryEntryId,
    label: record.label,
    summary: record.summary,
    ownerSurface: record.ownerSurface,
    status: record.status,
    controlPanelWorkspace: record.controlPanelWorkspace,
    dataClassification: record.dataClassification,
    detailRef: record.detailRef,
    evidenceRef: record.evidenceRef,
    wltImpact: record.wltImpact,
    runtimeTruth: false,
    backendSource: false,
    bindingSource: false,
  };
}

function byRegistryEntry(entryId: DshOperationalEntityId): readonly DshOperationalSurfaceSummary[] {
  return dshOperationalSummaryRecords
    .filter((record) => record.registryEntryId === entryId)
    .map(toSummary);
}

function byWorkspace(workspace: DshOperationalSummaryRecord['controlPanelWorkspace']): readonly DshOperationalSurfaceSummary[] {
  const registryEntryIds = new Set(getDshOperationalEntriesByWorkspace(workspace).map((entry) => entry.id));
  return dshOperationalSummaryRecords
    .filter((record) => registryEntryIds.has(record.registryEntryId))
    .map(toSummary);
}

export function buildDshOperationalSummaryForSurface(surfaceId: DshSurfaceId): readonly DshOperationalSurfaceSummary[] {
  const entryIds = new Set(getDshOperationalEntriesBySurface(surfaceId).map((entry) => entry.id));
  return dshOperationalSummaryRecords
    .filter((record) => record.ownerSurface === surfaceId || record.visibleSurfaces.includes(surfaceId) || entryIds.has(record.registryEntryId))
    .map(toSummary);
}

function buildDshControlPanelOperationsSummary(): readonly DshControlPanelOperationsSummary[] {
  return [
    { workspace: 'orders-queue', purpose: 'Order status, owner, SLA, exception, support, and settlement input visibility.', records: byWorkspace('orders-queue') },
    { workspace: 'trips-board', purpose: 'Trip status, assignment, pickup/dropoff, proof, failure, and return visibility.', records: byWorkspace('trips-board') },
    { workspace: 'captain-assignment-board', purpose: 'Captain candidates, WLT eligibility read-only, and assignment decision review.', records: byWorkspace('captain-assignment-board') },
    { workspace: 'store-preparation-sla', purpose: 'Store preparation, item issue, substitution, ready, and handoff visibility.', records: byWorkspace('store-preparation-sla') },
    { workspace: 'pickup-handoff-monitor', purpose: 'Pickup code, QR/barcode/photo, mismatch, and store delay evidence.', records: byWorkspace('pickup-handoff-monitor') },
    { workspace: 'pod-review-queue', purpose: 'Proof of delivery submitted, accepted, rejected, and audit-required states.', records: byWorkspace('pod-review-queue') },
    { workspace: 'cod-discrepancy-queue', purpose: 'COD expected, collected, discrepancy, and WLT handoff candidate visibility.', records: byWorkspace('cod-discrepancy-queue') },
    { workspace: 'exception-queue', purpose: 'Operational exceptions by type, severity, owner, status, action, and audit need.', records: byWorkspace('exception-queue') },
    { workspace: 'support-escalation-queue', purpose: 'Ticket, order, trip, exception, WLT reference, and rollback visibility.', records: byWorkspace('support-escalation-queue') },
    { workspace: 'settlement-inputs-snapshot', purpose: 'DSH settlement input events for WLT review only.', records: byWorkspace('settlement-inputs-snapshot') },
    { workspace: 'wlt-finance-bridge', purpose: 'WLT-owned finance bridge visibility; no DSH ledger or accounting truth.', records: byWorkspace('wlt-finance-bridge') },
    { workspace: 'audit-rollback', purpose: 'Operation history, snapshot rollback hint, permission, and evidence requirement.', records: byWorkspace('audit-rollback') },
  ] as const;
}

function buildDshSettlementInputSummary(): readonly DshOperationalSurfaceSummary[] {
  return byRegistryEntry('settlement-input-bridge');
}

function buildDshTripSummaryForOrder(orderId: string): readonly DshOperationalSurfaceSummary[] {
  return dshOperationalSummaryRecords
    .filter((record) => record.orderId === orderId && record.registryEntryId === 'delivery-trip')
    .map(toSummary);
}

function buildDshExceptionQueueSummary(): readonly DshOperationalSurfaceSummary[] {
  return byRegistryEntry('operational-exception');
}

function buildDshCodQueueSummary(): readonly DshOperationalSurfaceSummary[] {
  return byRegistryEntry('cod-collection');
}

function buildDshPodReviewSummary(): readonly DshOperationalSurfaceSummary[] {
  return byRegistryEntry('proof-of-delivery');
}

function getDshOperationalSummaryRegistryEntry(record: DshOperationalSummaryRecord) {
  return getDshOperationalEntryById(record.registryEntryId);
}
