export type {
  AnyOperationsWorkspaceId,
  CanonicalOperationsGroupId,
  LegacyOperationsWorkspaceId,
  LegacySectionRedirectId,
  NonOperationsSectionRootId,
  OperationsGroupMeta,
  OperationsNormalizationResult,
  OperationsPanelId,
  OperationsSubGroupMeta,
  OperationsTertiaryFilterId,
  OperationsViewState,
  StateViewCopy,
} from './operations.types';
export {
  OPERATIONS_CANONICAL_GROUPS,
  OPERATIONS_CANONICAL_GROUP_IDS,
  NON_OPERATIONS_SECTION_SHORTCUTS,
  buildOperationsHref,
  coerceOperationsPanel,
  getOperationsGroupMeta,
  normalizeOperationsLocation,
  resolveOperationsStateCopy,
} from './operations.registry';
export { default as ControlPanelDshOperationsScreen, DshOperationsHubSurface } from './OperationsHubScreen';
export type { ControlPanelDshOperationsScreenProps } from './OperationsHubScreen';
export { ControlPanelDshSheinProxyScreen } from './ControlPanelDshSheinProxyScreen';
export { AwnakScreen } from './AwnakScreen';
export { CommandCenterScreen } from './CommandCenterScreen';
export { LiveOrdersScreen } from './LiveOrdersScreen';
export { AssistedOrderDeskScreen } from './AssistedOrderDeskScreen';
export { OrderRescueScreen } from './OrderRescueScreen';
export { DispatchAssignmentScreen } from './DispatchAssignmentScreen';
export { GeoHeatmapScreen } from './GeoHeatmapScreen';
export { PartnerStoresScreen } from './PartnerStoresScreen';
export { AreaCapacityScreen } from './AreaCapacityScreen';
export { ExceptionsEscalationsScreen } from './ExceptionsEscalationsScreen';
export { AuditSupportSlaScreen } from './AuditSupportSlaScreen';

// ML-035: Audit trail detail workspace skeleton — BLOCKED_BY_CONTRACT (audit detail API not proven)
export { AuditTrailDetailWorkspace } from './AuditTrailDetailWorkspace';
export type { AuditTrailDetailWorkspaceProps } from './AuditTrailDetailWorkspace';

export { flowMeta as operationsFlowMeta } from './flow-meta';
