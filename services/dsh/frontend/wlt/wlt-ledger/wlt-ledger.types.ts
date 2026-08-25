import type { paths } from "@bthwani/wlt/openapi";

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

/** Canonical query DTO extracted from the WLT OpenAPI operation. */
export type DshWltLedgerParams = NonNullable<
  paths["/wlt/ledger/entries"]["get"]["parameters"]["query"]
>;

export type DshWltLedgerState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | {
      readonly kind: "loaded";
      readonly entries: readonly DshWltLedgerEntryView[];
      readonly nextCursor: string | undefined;
    }
  | { readonly kind: "error"; readonly message: string };
