import { resolveDshApiBaseUrl } from "../../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../../_kernel/dsh-http-request";
import type { DshWltLedgerEntryView, DshWltLedgerParams } from "./wlt-ledger.types";

// WLT internal financial reads are service-authenticated; DSH surfaces read
// them through the governed DSH finance proxy, never from the browser.
const { request: wltGet } = createDshHttpClient(resolveDshApiBaseUrl(), "wlt-ledger");

type WltLedgerEntryRaw = {
  readonly id: string;
  readonly entryType: string;
  readonly actorId: string;
  readonly actorType: string;
  readonly orderId: string | null;
  readonly referenceId: string;
  readonly referenceType: string;
  readonly amountMinorUnits: number;
  readonly currency: string;
  readonly debitCredit: "debit" | "credit";
  readonly balanceAfter: number;
  readonly description: string;
  readonly createdAt: string;
};

function mapActorTypeLabel(actorType: string): string {
  switch (actorType) {
    case "client": return "Client";
    case "partner": return "Partner";
    case "captain": return "Captain";
    case "system": return "System";
    case "platform": return "Platform";
    default: return actorType;
  }
}

function toView(e: WltLedgerEntryRaw): DshWltLedgerEntryView {
  return {
    id: e.id,
    entryType: e.entryType,
    actorId: e.actorId,
    actorTypeLabel: mapActorTypeLabel(e.actorType),
    orderId: e.orderId,
    referenceId: e.referenceId,
    referenceType: e.referenceType,
    amountLabel: String(e.amountMinorUnits),
    currency: e.currency,
    debitCreditLabel: e.debitCredit === "debit" ? "Debit" : "Credit",
    debitCreditBadge: e.debitCredit === "debit" ? "error" : "success",
    balanceAfterLabel: String(e.balanceAfter),
    description: e.description,
    createdAt: e.createdAt,
  };
}

export async function fetchDshWltLedgerEntries(params: DshWltLedgerParams): Promise<
  | { ok: true; entries: DshWltLedgerEntryView[]; nextCursor: string | undefined }
  | { ok: false; message: string }
> {
  try {
    const query = new URLSearchParams();
    if (params.actorId) query.set("actorId", params.actorId);
    if (params.actorType) query.set("actorType", params.actorType);
    if (params.orderId) query.set("orderId", params.orderId);
    if (params.entryType) query.set("entryType", params.entryType);
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    if (params.cursor) query.set("cursor", params.cursor);
    const qs = query.toString();
    const body = await wltGet<{ entries: WltLedgerEntryRaw[]; nextCursor?: string }>(
      `/dsh/control-panel/finance/ledger/entries${qs ? `?${qs}` : ""}`,
    );
    return {
      ok: true,
      entries: body.entries.map(toView),
      nextCursor: body.nextCursor,
    };
  } catch (e) {
    const err = e as { kind?: string; status?: number; message?: string };
    return { ok: false, message: err.message ?? `HTTP ${err.status ?? "error"}` };
  }
}
