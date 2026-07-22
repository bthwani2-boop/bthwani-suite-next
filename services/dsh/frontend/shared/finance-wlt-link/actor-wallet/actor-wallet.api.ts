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

const walletPathByActor: Record<RepresentativeActorType, string> = {
  client: "/dsh/client/me/finance/wallet",
  partner: "/dsh/partner/me/finance/wallet",
  captain: "/dsh/captain/me/finance/wallet",
  field: "/dsh/field/me/finance/wallet",
};

const ledgerPathByActor: Record<RepresentativeActorType, string> = {
  client: "/dsh/client/me/finance/ledger-entries",
  partner: "/dsh/partner/me/finance/ledger-entries",
  captain: "/dsh/captain/me/finance/ledger-entries",
  field: "/dsh/field/me/finance/ledger-entries",
};

export async function fetchOwnRepresentativeWallet(
  actorType: RepresentativeActorType,
): Promise<RepresentativeWallet> {
  const response = await request<{ readonly wallet: RepresentativeWallet }>(
    walletPathByActor[actorType],
  );
  return response.wallet;
}

export async function fetchOwnRepresentativeLedger(
  actorType: RepresentativeActorType,
  limit = 30,
): Promise<readonly RepresentativeLedgerEntry[]> {
  const safeLimit = Number.isInteger(limit) && limit > 0 && limit <= 100 ? limit : 30;
  const response = await request<{ readonly ledgerEntries: RepresentativeLedgerEntry[] }>(
    `${ledgerPathByActor[actorType]}?limit=${safeLimit}`,
  );
  return response.ledgerEntries ?? [];
}
