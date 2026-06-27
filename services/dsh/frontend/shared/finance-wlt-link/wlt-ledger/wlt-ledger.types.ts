export type DshWltLedgerEntryView = {
  readonly id: string;
  readonly entryType: string;
  readonly actorId: string;
  readonly actorTypeLabel: string;
  readonly orderId: string | null;
  readonly referenceId: string;
  readonly referenceType: string;
  readonly amountLabel: string;
  readonly currency: string;
  readonly debitCreditLabel: "Debit" | "Credit";
  readonly debitCreditBadge: "error" | "success";
  readonly balanceAfterLabel: string;
  readonly description: string;
  readonly createdAt: string;
};

export type DshWltLedgerParams = {
  readonly actorId?: string;
  readonly actorType?: string;
  readonly orderId?: string;
  readonly entryType?: string;
  readonly limit?: number;
  readonly cursor?: string;
};

export type DshWltLedgerState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | {
      readonly kind: "loaded";
      readonly entries: readonly DshWltLedgerEntryView[];
      readonly nextCursor: string | undefined;
    }
  | { readonly kind: "error"; readonly message: string };
