import { getDshControlPanelGovernanceEntry } from '../runtime/dsh-control-panel-governance.map';

const governance = getDshControlPanelGovernanceEntry('operations');

export const operationsFlowMeta = {
  id: 'dsh',
  owner: 'operations',
  ownerKind: 'section',
  placeholder: false,
  policyOwner: governance.policyOwner,
  escalationOwner: governance.escalationOwner,
  relatedRegistryFlowIds: governance.relatedRegistryFlowIds,
  notes: governance.notes,
} as const;
