import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshPublicHttpClient } from "../_kernel/dsh-http-request";

const baseUrl = resolveDshApiBaseUrl();
const { request } = createDshPublicHttpClient(baseUrl);

export type HomePublicReel = {
  readonly id: string;
  readonly titleAr: string;
  readonly titleEn: string;
  readonly videoUrl: string;
  readonly targetType: "master_product" | "store" | "offer";
  readonly targetId: string;
  readonly sortOrder: number;
};

export async function fetchHomePublicReels(limit = 10): Promise<readonly HomePublicReel[]> {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(20, Math.trunc(limit))) : 10;
  const resp = await request<{ readonly reels: readonly HomePublicReel[] }>(`/dsh/public/reels?limit=${safeLimit}`);
  return resp.reels;
}
