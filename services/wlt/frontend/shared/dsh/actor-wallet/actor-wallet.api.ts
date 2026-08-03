import type { components } from "@bthwani/wlt-openapi";
import { resolveDshApiBaseUrl } from "../dsh-link/dsh-api-base-url";
import { createDshHttpClient } from "../dsh-link/dsh-http-request";

/** Actor classes eligible to receive a governed commission policy. */
export type RepresentativeActorType = Extract<
  components["schemas"]["ActorType"],
  "partner" | "captain" | "field"
>;

/** Actor classes that expose a DSH-facing WLT wallet projection. */
export type RepresentativeWalletActorType = Extract<
  components["schemas"]["ActorType"],
  "client" | "partner" | "captain" | "field"
>;

/** WalletEnvelope remains open in WLT OpenAPI; this is a read-only projection. */
export type RepresentativeWallet = {
  readonly id: string;
  readonly actorId: string;
  readonly actorType: RepresentativeWalletActorType;
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

export type RepresentativeLedgerEntry = components["schemas"]["LedgerEntry"];

export type RepresentativeFinanceApiError = {
  readonly status?: number;
  readonly message?: string;
};

const { request } = createDshHttpClient(
  resolveDshApiBaseUrl(),
  "dsh-representative-wallet",
);

const walletPathByActor: Record<RepresentativeWalletActorType, string> = {
  client: "/dsh/client/me/finance/wallet",
  partner: "/dsh/partner/me/finance/wallet",
  captain: "/dsh/captain/me/finance/wallet",
  field: "/dsh/field/me/finance/wallet",
};

const ledgerPathByActor: Record<RepresentativeWalletActorType, string> = {
  client: "/dsh/client/me/finance/ledger-entries",
  partner: "/dsh/partner/me/finance/ledger-entries",
  captain: "/dsh/captain/me/finance/ledger-entries",
  field: "/dsh/field/me/finance/ledger-entries",
};

function normalizeRepresentativeActorId(actorId: string): string {
  const normalized = actorId.trim();
  if (!normalized || normalized.length > 200) {
    throw new Error("INVALID_REPRESENTATIVE_ACTOR_ID");
  }
  return normalized;
}

function safeLedgerLimit(limit: number): number {
  return Number.isInteger(limit) && limit > 0 && limit <= 100 ? limit : 30;
}

function controlPanelWalletPath(
  actorType: RepresentativeWalletActorType,
  actorId: string,
): string {
  return `/dsh/control-panel/finance/wallets/${actorType}/${encodeURIComponent(normalizeRepresentativeActorId(actorId))}`;
}

export async function fetchOwnRepresentativeWallet(
  actorType: RepresentativeWalletActorType,
): Promise<RepresentativeWallet> {
  const response = await request<{ readonly wallet: RepresentativeWallet }>(
    walletPathByActor[actorType],
  );
  return response.wallet;
}

export async function fetchOwnRepresentativeLedger(
  actorType: RepresentativeWalletActorType,
  limit = 30,
): Promise<readonly RepresentativeLedgerEntry[]> {
  const response = await request<{ readonly ledgerEntries: RepresentativeLedgerEntry[] }>(
    `${ledgerPathByActor[actorType]}?limit=${safeLedgerLimit(limit)}`,
  );
  return response.ledgerEntries ?? [];
}

export async function fetchRepresentativeWallet(
  actorType: RepresentativeWalletActorType,
  actorId: string,
): Promise<RepresentativeWallet> {
  const response = await request<{ readonly wallet: RepresentativeWallet }>(
    controlPanelWalletPath(actorType, actorId),
  );
  return response.wallet;
}

export async function fetchRepresentativeLedger(
  actorType: RepresentativeWalletActorType,
  actorId: string,
  limit = 50,
): Promise<readonly RepresentativeLedgerEntry[]> {
  const response = await request<{ readonly ledgerEntries: RepresentativeLedgerEntry[] }>(
    `${controlPanelWalletPath(actorType, actorId)}/ledger-entries?limit=${safeLedgerLimit(limit)}`,
  );
  return response.ledgerEntries ?? [];
}
