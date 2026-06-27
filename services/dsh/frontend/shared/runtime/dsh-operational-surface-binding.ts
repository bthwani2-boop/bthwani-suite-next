import type { DshSurfaceId } from './dsh-flow-registry';
import type {
  DshOperationalDataClassification,
  DshOperationalEntityId,
  DshOperationalWltImpact,
} from '../operations/dsh-operational.contract';
import type { DshOperationalSurfaceSummary } from '../operations/dsh-operational-summary-adapter';
import { buildDshOperationalSummaryForSurface } from '../operations/dsh-operational-summary-adapter';

export const dshOperationalSurfaceBindingMeta = {
  dataKind: 'OPERATIONAL_SURFACE_BINDING_METADATA',
  runtimeTruth: false,
  backendSource: false,
  bindingSource: true,
  phase: 'PHASE_4_EXISTING_SURFACE_BINDING',
} as const;

export type DshOperationalRuntimeBindingStatus =
  | 'metadata-bound'
  | 'snapshot-adapter-bound'
  | 'ui-render-binding-needed'
  | 'runtime-api-needed'
  | 'visual-evidence-needed';

export type DshOperationalScreenBinding = {
  readonly screenId: string;
  readonly surfaceId: DshSurfaceId;
  readonly routeHint: string;
  readonly ownerPath: string;
  readonly componentName: string;
  readonly registryEntryIds: readonly DshOperationalEntityId[];
  readonly snapshotSummaryIds: readonly string[];
  readonly visibleStates: readonly string[];
  readonly dataClassification: DshOperationalDataClassification;
  readonly wltImpact: DshOperationalWltImpact;
  readonly runtimeBindingStatus: DshOperationalRuntimeBindingStatus;
  readonly visualEvidenceRequired: boolean;
  readonly notes: string;
};

function summariesFor(surfaceId: DshSurfaceId): readonly DshOperationalSurfaceSummary[] {
  return buildDshOperationalSummaryForSurface(surfaceId);
}

function snapshotIdsFor(
  surfaceId: DshSurfaceId,
  registryEntryIds: readonly DshOperationalEntityId[],
): readonly string[] {
  const ids = new Set(registryEntryIds);
  return summariesFor(surfaceId)
    .filter((summary) => ids.has(summary.registryEntryId))
    .map((summary) => summary.summaryId);
}

function binding(
  record: Omit<DshOperationalScreenBinding, 'dataClassification' | 'runtimeBindingStatus' | 'visualEvidenceRequired'>,
): DshOperationalScreenBinding {
  return {
    ...record,
    dataClassification: 'SCAFFOLD',
    runtimeBindingStatus: 'metadata-bound',
    visualEvidenceRequired: true,
  };
}

export const DSH_OPERATIONAL_SCREEN_BINDINGS: readonly DshOperationalScreenBinding[] = [
  binding({
    screenId: 'app-client.orders-list',
    surfaceId: 'app-client',
    routeHint: 'orders',
    ownerPath: 'dsh/frontend/app-client/screens/OrdersTrackingScreens.tsx',
    componentName: 'DshOrdersListScreen',
    registryEntryIds: ['order-operational-truth', 'delivery-trip', 'proof-of-delivery', 'support-escalation'],
    snapshotSummaryIds: snapshotIdsFor('app-client', [
      'order-operational-truth',
      'delivery-trip',
      'proof-of-delivery',
      'support-escalation',
    ]),
    visibleStates: ['order-summary', 'current-owner', 'tracking-summary', 'support-context'],
    wltImpact: 'payment-status-read-only',
    notes: 'Client sees operational status and WLT payment reference as read-only context only.',
  }),
  binding({
    screenId: 'app-client.tracking-detail',
    surfaceId: 'app-client',
    routeHint: 'tracking/:orderId',
    ownerPath: 'dsh/frontend/app-client/screens/OrdersTrackingScreens.tsx',
    componentName: 'DshTrackingScreen',
    registryEntryIds: ['order-operational-truth', 'delivery-trip', 'proof-of-delivery', 'operational-exception'],
    snapshotSummaryIds: snapshotIdsFor('app-client', [
      'order-operational-truth',
      'delivery-trip',
      'proof-of-delivery',
      'operational-exception',
    ]),
    visibleStates: ['journey-stage', 'trip-milestone', 'proof-state', 'exception-state'],
    wltImpact: 'settlement-input-candidate',
    notes: 'Tracking binds to operational journey and proof states; finance remains outside the screen.',
  }),
  binding({
    screenId: 'app-partner.orders-inbox',
    surfaceId: 'app-partner',
    routeHint: 'orders',
    ownerPath: 'dsh/frontend/app-partner/screens/OrdersInboxScreen.tsx',
    componentName: 'PartnerOrdersInboxScreen',
    registryEntryIds: ['store-preparation', 'pickup-handoff', 'order-operational-truth', 'cod-collection'],
    snapshotSummaryIds: snapshotIdsFor('app-partner', [
      'store-preparation',
      'pickup-handoff',
      'order-operational-truth',
      'cod-collection',
    ]),
    visibleStates: ['acceptance', 'preparation-sla', 'handoff-state', 'cod-read-only-context'],
    wltImpact: 'settlement-input-candidate',
    notes: 'Partner owns preparation and handoff context; COD is event evidence only, not accounting.',
  }),
  binding({
    screenId: 'app-partner.orders-operations',
    surfaceId: 'app-partner',
    routeHint: 'orders/operations',
    ownerPath: 'dsh/frontend/app-partner/screens/OrdersInboxScreen.tsx',
    componentName: 'DshPartnerOrdersScreen',
    registryEntryIds: ['store-preparation', 'pickup-handoff', 'support-escalation', 'operational-exception'],
    snapshotSummaryIds: snapshotIdsFor('app-partner', [
      'store-preparation',
      'pickup-handoff',
      'support-escalation',
      'operational-exception',
    ]),
    visibleStates: ['preparation-board', 'handoff-proof', 'support-link', 'exception-owner'],
    wltImpact: 'refund-review-candidate',
    notes: 'Partner operations stay tied to DSH records and support links without copying ticket payloads.',
  }),
  binding({
    screenId: 'app-captain.pickup-dropoff',
    surfaceId: 'app-captain',
    routeHint: 'pickup-dropoff',
    ownerPath: 'dsh/frontend/app-captain/screens/DshCaptainPickupDropoffScreen.tsx',
    componentName: 'DshCaptainPickupDropoffScreen',
    registryEntryIds: ['delivery-trip', 'captain-assignment', 'pickup-handoff', 'proof-of-delivery', 'cod-collection'],
    snapshotSummaryIds: snapshotIdsFor('app-captain', [
      'delivery-trip',
      'captain-assignment',
      'pickup-handoff',
      'proof-of-delivery',
      'cod-collection',
    ]),
    visibleStates: ['assignment', 'arrival', 'pickup-proof', 'delivery-proof', 'cod-event'],
    wltImpact: 'cod-liability-candidate',
    notes: 'Captain surface records operational proof and COD collection event only; WLT owns liability.',
  }),
  binding({
    screenId: 'app-field.store-onboarding',
    surfaceId: 'app-field',
    routeHint: 'store-onboarding',
    ownerPath: 'dsh/frontend/app-field/screens/DshFieldStoreOnboardingScreen.tsx',
    componentName: 'DshFieldStoreOnboardingScreen',
    registryEntryIds: ['partner-store-onboarding', 'catalog-readiness', 'operational-exception'],
    snapshotSummaryIds: snapshotIdsFor('app-field', [
      'partner-store-onboarding',
      'catalog-readiness',
      'operational-exception',
    ]),
    visibleStates: ['visit-evidence', 'document-state', 'media-state', 'readiness-risk'],
    wltImpact: 'audit-candidate',
    notes: 'Field onboarding captures operational evidence for store activation and catalog readiness.',
  }),
  binding({
    screenId: 'control-panel.operations-hub',
    surfaceId: 'control-panel',
    routeHint: '/operations',
    ownerPath: 'dsh/frontend/control-panel/operations/OperationsHubScreen.tsx',
    componentName: 'OperationsHubScreen',
    registryEntryIds: [
      'order-operational-truth',
      'delivery-trip',
      'captain-assignment',
      'store-preparation',
      'pickup-handoff',
      'proof-of-delivery',
      'cod-collection',
      'operational-exception',
      'support-escalation',
      'settlement-input-bridge',
      'control-panel-operation',
    ],
    snapshotSummaryIds: snapshotIdsFor('control-panel', [
      'order-operational-truth',
      'delivery-trip',
      'captain-assignment',
      'store-preparation',
      'pickup-handoff',
      'proof-of-delivery',
      'cod-collection',
      'operational-exception',
      'support-escalation',
      'settlement-input-bridge',
      'control-panel-operation',
    ]),
    visibleStates: ['queue', 'workspace', 'audit', 'rollback-snapshot', 'wlt-bridge-read-only'],
    wltImpact: 'settlement-input-candidate',
    notes: 'Operations hub is the aggregation surface; Phase 5 defines operation-level workspace contracts.',
  }),
] as const;

export function getDshOperationalScreenBindings(): readonly DshOperationalScreenBinding[] {
  return DSH_OPERATIONAL_SCREEN_BINDINGS;
}

export function getDshOperationalScreenBindingByScreenId(screenId: string): DshOperationalScreenBinding | undefined {
  return DSH_OPERATIONAL_SCREEN_BINDINGS.find((bindingRecord) => bindingRecord.screenId === screenId);
}

export function getDshOperationalScreenBindingsBySurface(
  surfaceId: DshSurfaceId,
): readonly DshOperationalScreenBinding[] {
  return DSH_OPERATIONAL_SCREEN_BINDINGS.filter((bindingRecord) => bindingRecord.surfaceId === surfaceId);
}

export function getDshOperationalScreenBindingsByRegistryEntry(
  registryEntryId: DshOperationalEntityId,
): readonly DshOperationalScreenBinding[] {
  return DSH_OPERATIONAL_SCREEN_BINDINGS.filter((bindingRecord) =>
    bindingRecord.registryEntryIds.includes(registryEntryId),
  );
}

export function getDshOperationalSummariesForScreen(
  screenId: string,
): readonly DshOperationalSurfaceSummary[] {
  const bindingRecord = getDshOperationalScreenBindingByScreenId(screenId);
  if (!bindingRecord) {
    return [];
  }

  const snapshotIds = new Set(bindingRecord.snapshotSummaryIds);
  return summariesFor(bindingRecord.surfaceId).filter((summary) => snapshotIds.has(summary.summaryId));
}
