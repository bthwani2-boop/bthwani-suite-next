export type FinanceCanonicalWorkspaceId =
  | 'financial-command-center'
  | 'ledger-order-finance'
  | 'payments-wallets'
  | 'settlements-payouts'
  | 'refunds-disputes-holds'
  | 'commissions-fees-promo'
  | 'reconciliation-risk'
  | 'reports-policies-approvals';

export type FinanceLegacyWorkspaceAlias =
  | 'financial-center'
  | 'account-statements'
  | 'store-settlements'
  | 'settlement-calendar'
  | 'cod-cash'
  | 'refund-ledger'
  | 'ledger'
  | 'daily-close'
  | 'audit-close'
  | 'overview'
  | 'settlements'
  | 'cod-reconciliation'
  | 'captain-eligibility'
  | 'payouts'
  | 'tax-compliance'
  | 'risk-audit'
  | 'captain-finance'
  | 'store-delivery-finance'
  | 'refunds'
  | 'variances'
  | 'stores'
  | 'partners'
  | 'partner-settlements';

export type FinanceWorkspaceInput =
  | FinanceCanonicalWorkspaceId
  | FinanceLegacyWorkspaceAlias;

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
