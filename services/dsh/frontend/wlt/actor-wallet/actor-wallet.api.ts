import type { operations } from "@bthwani/dsh/openapi";
import type { components } from "@bthwani/wlt/openapi";
import { resolveDshApiBaseUrl } from "../../shared/_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../../shared/_kernel/dsh-http-request";

/** Actor classes eligible to receive a governed commission policy. */
export type RepresentativeActorType = Extract<
  components["schemas"]["ActorType"],
  "partner" | "captain" | "field"
>;

/** Actor classes that expose a DSH-facing WLT wallet projection. */
export type RepresentativeWalletActorType = components["schemas"]["ActorType"];

type DshRepresentativeWalletEnvelope =
  operations["getDshFieldMeWallet"]["responses"][200]["content"]["application/json"];

/** Derived from the composed DSH representative-finance contract; WLT owns truth. */
export type RepresentativeWallet = DshRepresentativeWalletEnvelope["wallet"];

export type RepresentativeLedgerEntry = components["schemas"]["LedgerEntry"];

export type RepresentativeFinanceApiError = {
  readonly status?: number;
  readonly message?: string;
};

const { request } = createDshHttpClient(
  resolveDshApiBaseUrl(),
  "dsh-representative-wallet",
);

const walletPathByActor: Partial<Record<RepresentativeWalletActorType, string>> = {
  client: "/dsh/client/me/finance/wallet",
  partner: "/dsh/partner/me/finance/wallet",
  captain: "/dsh/captain/me/finance/wallet",
  field: "/dsh/field/me/finance/wallet",
};

const ledgerPathByActor: Partial<Record<RepresentativeWalletActorType, string>> = {
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
  const path = walletPathByActor[actorType];
  if (!path) throw new Error("UNSUPPORTED_REPRESENTATIVE_ACTOR_TYPE");
  const response = await request<{ readonly wallet: RepresentativeWallet }>(
    path,
  );
  return response.wallet;
}

export async function fetchOwnRepresentativeLedger(
  actorType: RepresentativeWalletActorType,
  limit = 30,
): Promise<readonly RepresentativeLedgerEntry[]> {
  const path = ledgerPathByActor[actorType];
  if (!path) throw new Error("UNSUPPORTED_REPRESENTATIVE_ACTOR_TYPE");
  const response = await request<{ readonly ledgerEntries: RepresentativeLedgerEntry[] }>(
    `${path}?limit=${safeLedgerLimit(limit)}`,
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
