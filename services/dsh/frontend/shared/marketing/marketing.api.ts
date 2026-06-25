import { getIdentityAccessToken } from "@bthwani/core-identity";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import type { DshCampaign, DshBanner, DshPromo } from "./marketing.types";

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

export const fetchCampaigns = () => req<{ campaigns: DshCampaign[] }>("/dsh/operator/marketing/campaigns");
export const createCampaign = (body: { title: string; description?: string; startDate?: string; endDate?: string }) =>
  req<{ campaign: DshCampaign }>("/dsh/operator/marketing/campaigns", { method: "POST", body: JSON.stringify(body) });
export const getCampaign = (id: string) => req<{ campaign: DshCampaign }>(`/dsh/operator/marketing/campaigns/${id}`);
export const updateCampaign = (id: string, body: { status?: string; title?: string; description?: string }) =>
  req<{ campaign: DshCampaign }>(`/dsh/operator/marketing/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(body) });
export const deleteCampaign = (id: string) =>
  req<{ deleted: boolean }>(`/dsh/operator/marketing/campaigns/${id}`, { method: "DELETE" });

export const fetchBanners = () => req<{ banners: DshBanner[] }>("/dsh/operator/marketing/banners");
export const createBanner = (body: { title: string; imageUrl?: string; actionUrl?: string; position?: number }) =>
  req<{ banner: DshBanner }>("/dsh/operator/marketing/banners", { method: "POST", body: JSON.stringify(body) });
export const updateBanner = (id: string, body: { isActive?: boolean; title?: string; imageUrl?: string }) =>
  req<{ banner: DshBanner }>(`/dsh/operator/marketing/banners/${id}`, { method: "PATCH", body: JSON.stringify(body) });
export const deleteBanner = (id: string) =>
  req<{ deleted: boolean }>(`/dsh/operator/marketing/banners/${id}`, { method: "DELETE" });

export const fetchPromos = () => req<{ promos: DshPromo[] }>("/dsh/operator/marketing/promos");
export const createPromo = (body: { code: string; description?: string; expiresAt?: string }) =>
  req<{ promo: DshPromo }>("/dsh/operator/marketing/promos", { method: "POST", body: JSON.stringify(body) });
export const updatePromo = (id: string, body: { status?: string }) =>
  req<{ promo: DshPromo }>(`/dsh/operator/marketing/promos/${id}`, { method: "PATCH", body: JSON.stringify(body) });
