import { createDshHttpClient } from "../_kernel/dsh-http-request";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "provider-ratings", 10000);

export type PartnerFieldRatingPrompt = {
  readonly eligible: boolean;
  readonly completed: boolean;
  readonly partnerId?: string;
  readonly partnerName?: string;
  readonly fieldActorId?: string;
  readonly activationStatus?: string;
  readonly reason?: string;
};

export type ClientOrderRatingPrompt = {
  readonly eligible: boolean;
  readonly completed: boolean;
  readonly orderId: string;
  readonly orderNumber?: string;
  readonly captainActorId?: string;
  readonly captainRated: boolean;
  readonly orderRated: boolean;
  readonly reason?: string;
};

export type ProviderRating = {
  readonly id: string;
  readonly targetKind: "field" | "captain" | "order";
  readonly targetActorId?: string;
  readonly sourceKind: "partner_activation" | "order_delivery";
  readonly sourceId: string;
  readonly score: number;
  readonly comment?: string;
  readonly status: "active" | "retracted";
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type ProviderRatingSummary = {
  readonly targetKind: "field" | "captain";
  readonly targetActorId: string;
  readonly averageScore: number;
  readonly ratingCount: number;
  readonly distribution: Readonly<Record<string, number>>;
  readonly lastRatedAt?: string;
};

export async function fetchPartnerFieldRatingPrompt(): Promise<PartnerFieldRatingPrompt> {
  const result = await request<{ prompt: PartnerFieldRatingPrompt }>("/dsh/partner/me/ratings/field/prompt");
  return result.prompt;
}

export async function submitPartnerFieldRating(score: number, comment = ""): Promise<ProviderRating> {
  const result = await request<{ rating: ProviderRating }>("/dsh/partner/me/ratings/field", {
    method: "POST",
    body: { score, comment },
  });
  return result.rating;
}

export async function fetchClientOrderRatingPrompt(orderId: string): Promise<ClientOrderRatingPrompt> {
  const result = await request<{ prompt: ClientOrderRatingPrompt }>(
    `/dsh/client/orders/${encodeURIComponent(orderId)}/rating-prompt`,
  );
  return result.prompt;
}

export async function submitClientOrderRatings(
  orderId: string,
  input: { readonly captainScore: number; readonly orderScore: number; readonly captainComment?: string; readonly orderComment?: string },
): Promise<readonly ProviderRating[]> {
  const result = await request<{ ratings: ProviderRating[] }>(
    `/dsh/client/orders/${encodeURIComponent(orderId)}/ratings`,
    { method: "POST", body: input },
  );
  return result.ratings;
}

export async function fetchOwnProviderRatingSummary(kind: "field" | "captain"): Promise<ProviderRatingSummary> {
  const result = await request<{ summary: ProviderRatingSummary }>(`/dsh/${kind}/me/ratings/summary`);
  return result.summary;
}
