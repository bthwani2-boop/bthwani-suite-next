import { getIdentityAccessToken } from "@bthwani/core-identity";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient, createDshPublicHttpClient } from "../_kernel/dsh-http-request";
import type {
  GovernedPublicReel,
  GovernedReel,
  GovernedReelReviewInput,
  GovernedReelSubmissionInput,
} from "./reels.types";

const baseUrl = resolveDshApiBaseUrl();
const { request } = createDshHttpClient(baseUrl, "reels-corr");
const { request: publicRequest } = createDshPublicHttpClient(baseUrl);

export async function submitGovernedReel(input: GovernedReelSubmissionInput): Promise<GovernedReel> {
  const response = await request<{ readonly reel: GovernedReel }>("/dsh/partner/reels", {
    method: "POST",
    body: input,
  });
  return response.reel;
}

export async function fetchPartnerReels(input: {
  readonly storeId: string;
  readonly limit?: number;
  readonly offset?: number;
}): Promise<readonly GovernedReel[]> {
  const params = new URLSearchParams();
  params.set("storeId", input.storeId);
  if (input.limit !== undefined) params.set("limit", String(input.limit));
  if (input.offset !== undefined) params.set("offset", String(input.offset));
  const response = await request<{ readonly reels: readonly GovernedReel[] }>(
    `/dsh/partner/reels?${params.toString()}`,
  );
  return response.reels;
}

export async function fetchOperatorReels(input?: {
  readonly status?: string;
  readonly limit?: number;
  readonly offset?: number;
}): Promise<readonly GovernedReel[]> {
  const params = new URLSearchParams();
  if (input?.status) params.set("status", input.status);
  if (input?.limit !== undefined) params.set("limit", String(input.limit));
  if (input?.offset !== undefined) params.set("offset", String(input.offset));
  const query = params.toString();
  const response = await request<{ readonly reels: readonly GovernedReel[] }>(
    query ? `/dsh/operator/reels?${query}` : "/dsh/operator/reels",
  );
  return response.reels;
}

export async function reviewGovernedReel(
  reelId: string,
  input: GovernedReelReviewInput,
): Promise<GovernedReel> {
  const response = await request<{ readonly reel: GovernedReel }>(
    `/dsh/operator/reels/${encodeURIComponent(reelId)}/review`,
    { method: "POST", body: input },
  );
  return response.reel;
}

export async function fetchOperatorReelMediaBlob(
  reelId: string,
  kind: "video" | "poster",
): Promise<Blob> {
  const token = getIdentityAccessToken();
  if (!token) throw new Error("IDENTITY_SESSION_REQUIRED");
  const response = await fetch(
    `${baseUrl}/dsh/operator/reels/${encodeURIComponent(reelId)}/media/${kind}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: kind === "video" ? "video/mp4" : "image/*",
      },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error(`REEL_MEDIA_PREVIEW_FAILED:${response.status}`);
  }
  return response.blob();
}

export async function fetchGovernedPublicReels(limit = 20): Promise<readonly GovernedPublicReel[]> {
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  const response = await publicRequest<{ readonly reels: readonly GovernedPublicReel[] }>(
    `/dsh/public/reels?limit=${safeLimit}`,
  );
  return response.reels;
}
