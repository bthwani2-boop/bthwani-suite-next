import { resolveDshApiBaseUrl } from "../../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../../_kernel/dsh-http-request";

export type RepresentativeActorType = "client" | "partner" | "captain" | "field";

export type RepresentativeWallet = {
  readonly id: string;
  readonly actorId: string;
  readonly actorType: RepresentativeActorType;
  readonly status: "active" | "suspended" | "frozen" | "closed" | string;
  readonly currency: string;
  readonly availableBalanceMinorUnits: number;
  readonly pendingBalanceMinorUnits: number;
  readonly heldBalanceMinorUnits: number;
  readonly earnedTotalMinorUnits: number;
  readonly settledTotalMinorUnits: number;
  readonly paidTotalMinorUnits: number;
  readonly lastLedgerEntryAt: string | null;
  readonly updatedAt: string | null;
};

export type RepresentativeLedgerEntry = {
  readonly id: string;
  readonly entryType: string;
  readonly actorId: string;
  readonly actorType: RepresentativeActorType;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly referenceId: string;
  readonly referenceType: string;
  readonly amountMinorUnits: number;
  readonly currency: string;
  readonly debitCredit: "debit" | "credit" | string;
  readonly balanceAfter: number;
  readonly description: string;
  readonly createdAt: string;
};

export type RepresentativeFinanceApiError = {
  readonly status?: number;
  readonly message?: string;
};

const { request } = createDshHttpClient(
  resolveDshApiBaseUrl(),
  "dsh-representative-wallet",
);

function ownFinanceBase(actorType: RepresentativeActorType): string {
  return `/dsh/${actorType}/me/finance`;
}

export async function fetchOwnRepresentativeWallet(
  actorType: RepresentativeActorType,
): Promise<RepresentativeWallet> {
  const response = await request<{ readonly wallet: RepresentativeWallet }>(
    `${ownFinanceBase(actorType)}/wallet`,
  );
  return response.wallet;
}

export async function fetchOwnRepresentativeLedger(
  actorType: RepresentativeActorType,
  limit = 30,
): Promise<readonly RepresentativeLedgerEntry[]> {
  const safeLimit = Number.isInteger(limit) && limit > 0 && limit <= 100 ? limit : 30;
  const response = await request<{ readonly ledgerEntries: RepresentativeLedgerEntry[] }>(
    `${ownFinanceBase(actorType)}/ledger-entries?limit=${safeLimit}`,
  );
  return response.ledgerEntries ?? [];
}
