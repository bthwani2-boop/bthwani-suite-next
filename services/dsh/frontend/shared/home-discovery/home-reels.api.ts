import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshPublicHttpClient } from "../_kernel/dsh-http-request";
import { resolveDshMediaUrl } from "../_kernel/dsh-media-url";

const baseUrl = resolveDshApiBaseUrl();
const { request } = createDshPublicHttpClient(baseUrl);

type RawHomePublicReel = {
  readonly id: string;
  readonly titleAr?: string;
  readonly titleEn?: string;
  readonly subtitleAr?: string;
  readonly subtitleEn?: string;
  readonly highlightAr?: string;
  readonly highlightEn?: string;
  readonly ctaLabelAr?: string;
  readonly ctaLabelEn?: string;
  readonly videoUrl: string;
  readonly posterUrl?: string;
  readonly targetType: "master_product" | "store" | "offer";
  readonly targetId: string;
  readonly sortOrder: number;
};

export type HomePublicReel = {
  readonly id: string;
  readonly titleAr: string;
  readonly titleEn: string;
  readonly subtitleAr: string;
  readonly subtitleEn: string;
  readonly highlightAr: string;
  readonly highlightEn: string;
  readonly ctaLabelAr: string;
  readonly ctaLabelEn: string;
  readonly videoUrl: string;
  readonly posterUrl: string;
  readonly targetType: "master_product" | "store" | "offer";
  readonly targetId: string;
  readonly sortOrder: number;
};

export async function fetchHomePublicReels(limit = 10): Promise<readonly HomePublicReel[]> {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(20, Math.trunc(limit))) : 10;
  const resp = await request<{ readonly reels: readonly RawHomePublicReel[] }>(
    `/dsh/public/reels?limit=${safeLimit}`,
  );
  return resp.reels
    .map((reel) => ({
      id: reel.id,
      titleAr: reel.titleAr?.trim() ?? "",
      titleEn: reel.titleEn?.trim() ?? "",
      subtitleAr: reel.subtitleAr?.trim() ?? "",
      subtitleEn: reel.subtitleEn?.trim() ?? "",
      highlightAr: reel.highlightAr?.trim() ?? "",
      highlightEn: reel.highlightEn?.trim() ?? "",
      ctaLabelAr: reel.ctaLabelAr?.trim() ?? "",
      ctaLabelEn: reel.ctaLabelEn?.trim() ?? "",
      videoUrl: resolveDshMediaUrl(reel.videoUrl) ?? "",
      posterUrl: resolveDshMediaUrl(reel.posterUrl) ?? "",
      targetType: reel.targetType,
      targetId: reel.targetId,
      sortOrder: reel.sortOrder,
    }))
    .filter((reel) => reel.id.trim().length > 0 && reel.videoUrl.length > 0);
}
