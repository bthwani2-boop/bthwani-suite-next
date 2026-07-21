import { createDshFlexibleHttpClient } from "../_kernel/dsh-http-request";
import { resolveDshApiBaseUrl, validateDshApiBaseUrl } from "../_kernel/dsh-api-base-url";

export type DshHomeMarketingEventInput = Readonly<{
  eventType: "impression" | "click";
  contentKind: "banners" | "promos";
  contentId: string;
  viewerRef?: string;
}>;

export async function recordHomeMarketingEvent(input: DshHomeMarketingEventInput): Promise<boolean> {
  const baseUrl = resolveDshApiBaseUrl();
  if (!validateDshApiBaseUrl(baseUrl) || input.contentId.trim().length === 0) return false;
  const httpClient = createDshFlexibleHttpClient(baseUrl);
  try {
    await httpClient.request<void>("/dsh/home-discovery/events", {
      method: "POST",
      body: input,
    });
    return true;
  } catch {
    // Marketing telemetry is non-blocking: the user journey remains usable while
    // the failed event stays absent rather than being replaced by fabricated data.
    return false;
  }
}
