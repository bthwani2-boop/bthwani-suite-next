export type WltLedgerEntryKind =
  | 'cod-collection'
  | 'client-payment'
  | 'partner-settlement'
  | 'captain-earning'
  | 'field-commission'
  | 'store-fee'
  | 'platform-commission'
  | 'refund'
  | 'wallet-movement'
  | 'other';

export type WltLedgerEntryStatus = 'posted' | 'pending' | 'disputed' | 'blocked';

export type WltLedgerEntryFormatted = {
  readonly id: string;
  readonly debitAccountCode: string;
  readonly debitAccountLabel: string;
  readonly creditAccountCode: string;
  readonly creditAccountLabel: string;
  readonly amountMinorUnits: number;
  readonly amountLabel: string;
  readonly entryKind: WltLedgerEntryKind;
  readonly party: string;
  readonly partyKind: 'client' | 'captain' | 'partner' | 'field' | 'platform';
  readonly sourceRef: string;
  readonly statusLabel: string;
  readonly status: WltLedgerEntryStatus;
  readonly isPending: boolean;
  readonly needsReconciliation: boolean;
  readonly isPreview: boolean;
};

export type WltAccountPositionLine = {
  readonly accountCode: string;
  readonly accountLabel: string;
  readonly accountType: 'asset' | 'liability' | 'revenue' | 'expense';
  readonly totalMinorUnits: number;
  readonly totalLabel: string;
  readonly entryCount: number;
  readonly pendingCount: number;
  readonly entries: readonly WltLedgerEntryFormatted[];
  readonly isPreview: boolean;
};

export type WltFinancialCenterSection = {
  readonly sectionType: 'asset' | 'liability' | 'revenue' | 'expense';
  readonly sectionLabel: string;
  readonly totalMinorUnits: number;
  readonly totalLabel: string;
  readonly lines: readonly WltAccountPositionLine[];
};

export type WltFinancialCenterBlockingVariance = {
  readonly entryId: string;
  readonly description: string;
  readonly varianceMinorUnits: number;
  readonly varianceLabel: string;
  readonly partyKind: string;
  readonly reason: string;
};

export type WltFinancialCenter = {
  readonly businessDate: string;
  readonly sections: readonly WltFinancialCenterSection[];
  readonly allEntries: readonly WltLedgerEntryFormatted[];
  readonly totalAssets: number;
  readonly totalAssetsLabel: string;
  readonly totalLiabilities: number;
  readonly totalLiabilitiesLabel: string;
  readonly totalRevenue: number;
  readonly totalRevenueLabel: string;
  readonly totalExpenses: number;
  readonly totalExpensesLabel: string;
  readonly netPosition: number;
  readonly netPositionLabel: string;
  readonly blockingVariances: readonly WltFinancialCenterBlockingVariance[];
  readonly canClose: boolean;
  readonly contractState: string;
  readonly openingBalanceSource: string;
  readonly closingBalanceSource: string;
  readonly isPreview: boolean;
};

export type WltCloseStatus = {
  readonly id?: string | null;
  readonly status: 'open' | 'closed' | string;
  readonly businessDate: string;
};

export type WltDshFinanceRuntimeReadModel = {
  readonly baseUrl: string;
  readonly overview: any; // settlements list
  readonly ledgerEntries: readonly any[]; // raw ledger entries
  readonly refunds: readonly any[]; // raw refunds queue
  // Optional: WLT does not expose a reconciliation close-status endpoint yet,
  // so runtime read models omit it. Consumers must treat "absent" as open.
  readonly closeStatus?: WltCloseStatus;
  readonly fetchedAt: string;
};

export type WltDshFinanceRuntimeResult =
  | { readonly state: 'runtime'; readonly data: WltDshFinanceRuntimeReadModel }
  | { readonly state: 'blocked'; readonly error: string; readonly baseUrl: string };

export type WltDshFinanceHubViewModel = {
  readonly center: WltFinancialCenter | null;
  readonly pendingCount: number;
  readonly openRisksCount: number;
  readonly affectedSurfaces: string;
  readonly requiredAction: string;
  readonly operationalRisk: string;
  readonly holdsStatus: string;
};
