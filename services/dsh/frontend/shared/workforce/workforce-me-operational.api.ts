import { createDshHttpClient } from "../_kernel/dsh-http-request";
import { resolveWorkforceApiBaseUrl } from "../_kernel/workforce-api-base-url";
import type {
  OperationalCoreResponse,
  ProviderAvailabilityNotice,
  ProviderIncident,
} from "./workforce.types";

const { request } = createDshHttpClient(resolveWorkforceApiBaseUrl(), "workforce-me-operational", 10000);

export function fetchOwnOperationalCore(): Promise<OperationalCoreResponse> {
  return request<OperationalCoreResponse>("/workforce/me/operational-core");
}

export async function listOwnAvailabilityNotices(limit = 50): Promise<readonly ProviderAvailabilityNotice[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
  const result = await request<{ availabilityNotices: ProviderAvailabilityNotice[] }>(
    `/workforce/me/availability-notices?limit=${safeLimit}`,
  );
  return result.availabilityNotices;
}

export async function createOwnAvailabilityNotice(input: {
  readonly noticeType: ProviderAvailabilityNotice["noticeType"];
  readonly startsAt: string;
  readonly endsAt: string;
  readonly serviceZoneId?: string;
  readonly reasonCode: string;
  readonly note?: string;
}): Promise<ProviderAvailabilityNotice> {
  const result = await request<{ availabilityNotice: ProviderAvailabilityNotice }>(
    "/workforce/me/availability-notices",
    { method: "POST", body: input },
  );
  return result.availabilityNotice;
}

export async function listOwnProviderIncidents(limit = 50): Promise<readonly ProviderIncident[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
  const result = await request<{ incidents: ProviderIncident[] }>(`/workforce/me/incidents?limit=${safeLimit}`);
  return result.incidents;
}

export async function submitOwnProviderIncidentAppeal(incidentId: string, note: string): Promise<ProviderIncident> {
  const result = await request<{ incident: ProviderIncident }>(
    `/workforce/me/incidents/${encodeURIComponent(incidentId)}/appeal`,
    { method: "POST", body: { note } },
  );
  return result.incident;
}
