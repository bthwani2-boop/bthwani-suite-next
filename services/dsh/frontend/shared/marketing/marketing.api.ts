import { getIdentityAccessToken } from "@bthwani/core-identity";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import type { DshCampaign, MarketingNewsTickerItem } from "./marketing.types";

const baseUrl = resolveDshApiBaseUrl();
let c = 0;
const corrId = () => `mkt-${Date.now()}-${++c}`;

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getIdentityAccessToken();
  if (!token) throw { kind: "http", status: 401 };
  const res = await fetch(new URL(path, baseUrl), {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Correlation-ID": corrId(),
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw { kind: "http", status: res.status };
  return res.json() as Promise<T>;
}

type MarketingTargetFields = {
  targetType?: string;
  targetId?: string;
  audience?: string;
  placement?: string;
};

export const fetchCampaigns = () => req<{ campaigns: DshCampaign[] }>("/dsh/operator/marketing/campaigns");
export const createCampaign = (body: { title: string; description?: string; startDate?: string; endDate?: string } & MarketingTargetFields) =>
  req<{ campaign: DshCampaign }>("/dsh/operator/marketing/campaigns", { method: "POST", body: JSON.stringify(body) });
export const getCampaign = (id: string) => req<{ campaign: DshCampaign }>(`/dsh/operator/marketing/campaigns/${id}`);
export const updateCampaign = (id: string, body: { status?: string; title?: string; description?: string } & MarketingTargetFields) =>
  req<{ campaign: DshCampaign }>(`/dsh/operator/marketing/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(body) });
// Archive is a soft archive (status -> cancelled, archivedAt set) — the row is
// never physically deleted. The response reflects that: { archived: true }.
export const archiveCampaign = (id: string) =>
  req<{ archived: boolean }>(`/dsh/operator/marketing/campaigns/${id}`, { method: "DELETE" });

export type MarketingTickerWritePayload = Partial<
  Omit<MarketingNewsTickerItem, "id" | "clicks" | "impressions" | "updatedAt">
>;

export const fetchTickers = () => req<{ tickers: MarketingNewsTickerItem[] }>("/dsh/operator/marketing/tickers");
export const createTicker = (body: MarketingTickerWritePayload & { message: string }) =>
  req<{ ticker: MarketingNewsTickerItem }>("/dsh/operator/marketing/tickers", { method: "POST", body: JSON.stringify(body) });
// Status lifecycle is governed server-side (draft -> published|paused,
// published <-> paused, never back to draft); illegal transitions return 409.
export const updateTicker = (id: string, body: MarketingTickerWritePayload) =>
  req<{ ticker: MarketingNewsTickerItem }>(`/dsh/operator/marketing/tickers/${id}`, { method: "PATCH", body: JSON.stringify(body) });
// Delete is a soft delete (deletedAt recorded server-side).
export const deleteTicker = (id: string) =>
  req<{ deleted: boolean }>(`/dsh/operator/marketing/tickers/${id}`, { method: "DELETE" });
