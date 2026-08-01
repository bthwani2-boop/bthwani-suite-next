import { createDshFlexibleHttpClient } from "../_kernel/dsh-http-request";
import { resolveDshApiBaseUrl, validateDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import type { DshHomeAudienceSegment } from "./home-discovery.types";

export type DshHomeMarketingEventInput = Readonly<{
  eventType: "impression" | "click";
  contentKind: "banners" | "promos";
  contentId: string;
  viewerRef: string;
  cityCode: string;
  serviceAreaCode: string;
  audienceSegment: DshHomeAudienceSegment;
}>;

export async function recordHomeMarketingEvent(input: DshHomeMarketingEventInput): Promise<boolean> {
  const baseUrl = resolveDshApiBaseUrl();
  if (
    !validateDshApiBaseUrl(baseUrl) ||
    input.contentId.trim().length === 0 ||
    input.viewerRef.trim().length < 8
  ) return false;
  const httpClient = createDshFlexibleHttpClient(baseUrl);
  try {
    await httpClient.request<void>("/dsh/home-discovery/events", {
      method: "POST",
      body: input,
    });
    return true;
  } catch {
    // Telemetry is non-blocking: a failed event remains absent rather than being
    // replaced by fabricated counters or optimistic local analytics.
    return false;
  }
}
