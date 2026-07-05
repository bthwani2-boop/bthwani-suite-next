import type { WltDshLedgerEntry } from "./wlt-dsh-boundary.types";
import { getWltApiBaseUrl } from "./wlt-dsh-api-base-url";
import { wltFetchJson, type WltReferenceApiResult } from "./wlt-dsh-http-request";

export type WltLedgerEntriesParams = {
  readonly actorId?: string;
  readonly actorType?: string;
  readonly orderId?: string;
  readonly entryType?: string;
  readonly limit?: number;
  readonly cursor?: string;
};

export async function fetchWltLedgerEntries(
  params: WltLedgerEntriesParams,
): Promise<WltReferenceApiResult<{ entries: WltDshLedgerEntry[]; nextCursor?: string }>> {
  const baseUrl = getWltApiBaseUrl();
  if (!baseUrl) {
    return { ok: false, kind: "network", message: "WLT API base URL is not configured" };
  }
  const query = new URLSearchParams();
  if (params.actorId) query.set("actorId", params.actorId);
  if (params.actorType) query.set("actorType", params.actorType);
  if (params.orderId) query.set("orderId", params.orderId);
  if (params.entryType) query.set("entryType", params.entryType);
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.cursor) query.set("cursor", params.cursor);
  const qs = query.toString();
  return wltFetchJson<{ entries: WltDshLedgerEntry[]; nextCursor?: string }>(
    `${baseUrl}/wlt/ledger/entries${qs ? `?${qs}` : ""}`,
    (body: any) => {
      const result: { entries: WltDshLedgerEntry[]; nextCursor?: string } = {
        entries: body.entries as WltDshLedgerEntry[],
      };
      if (typeof body.nextCursor === "string") {
        result.nextCursor = body.nextCursor;
      }
      return result;
    },
  );
}
