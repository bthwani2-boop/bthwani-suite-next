export type FinanceCanonicalWorkspaceId =
  | 'financial-command-center'
  | 'ledger-order-finance'
  | 'payments-wallets'
  | 'settlements-payouts'
  | 'refunds-disputes-holds'
  | 'commissions-fees-promo'
  | 'reconciliation-risk'
  | 'reports-policies-approvals';

export type CanonicalFinanceGroupId = FinanceCanonicalWorkspaceId;

export type FinancePanelId = 'detail' | 'evidence';

export type FinanceViewState = 'loading' | 'ready' | 'empty' | 'error' | 'offline' | 'disabled' | 'blocked';

export interface FinanceGroupMeta {
  id: CanonicalFinanceGroupId;
  label: string;
  description: string;
  badge?: string;
  subGroups?: readonly { id: string; label: string }[];
}

export type FinanceNormalizationResult = {
  kind: 'group';
  group: CanonicalFinanceGroupId;
  sourceWorkspace?: string | undefined;
  panel?: FinancePanelId | undefined;
  subGroup?: string | undefined;
};
