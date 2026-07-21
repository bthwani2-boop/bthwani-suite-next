import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type {
  DshMapProviderHealth,
  DshMapReverseInput,
  DshMapSearchInput,
  DshServiceArea,
  DshServiceAreaUpsertInput,
  DshVerifiedMapLocation,
} from "./client-map.types";

const { request } = createDshHttpClient(
  resolveDshApiBaseUrl(),
  "dsh-client-map",
);

function stableServiceAreaKey(
  serviceAreaCode: string,
  input: DshServiceAreaUpsertInput,
): string {
  const text = JSON.stringify(input);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `service-area:${serviceAreaCode}:${(hash >>> 0)
    .toString(16)
    .padStart(8, "0")}`;
}

export async function searchDshClientMapLocations(
  input: DshMapSearchInput,
): Promise<readonly DshVerifiedMapLocation[]> {
  const result = await request<{ locations: DshVerifiedMapLocation[] }>(
    "/dsh/client/maps/search",
    {
      method: "POST",
      body: input,
      idempotencyKey: `map-search:${input.query.trim().toLowerCase()}`,
    },
  );
  return result.locations;
}

export async function reverseDshClientMapLocation(
  input: DshMapReverseInput,
): Promise<DshVerifiedMapLocation> {
  const result = await request<{ location: DshVerifiedMapLocation }>(
    "/dsh/client/maps/reverse",
    {
      method: "POST",
      body: input,
      idempotencyKey: `map-reverse:${input.latitude.toFixed(6)}:${input.longitude.toFixed(6)}`,
    },
  );
  return result.location;
}

export async function getDshOperatorMapProviderHealth(): Promise<DshMapProviderHealth> {
  const result = await request<{ mapProviderHealth: DshMapProviderHealth }>(
    "/dsh/operator/platform/map-provider-health",
  );
  return result.mapProviderHealth;
}

export async function listDshOperatorServiceAreas(): Promise<
  readonly DshServiceArea[]
> {
  const result = await request<{ serviceAreas: DshServiceArea[] }>(
    "/dsh/operator/platform/service-areas",
  );
  return result.serviceAreas;
}

export async function upsertDshOperatorServiceArea(
  serviceAreaCode: string,
  input: DshServiceAreaUpsertInput,
): Promise<DshServiceArea> {
  const result = await request<{ serviceArea: DshServiceArea }>(
    `/dsh/operator/platform/service-areas/${encodeURIComponent(
      serviceAreaCode,
    )}`,
    {
      method: "PUT",
      body: input,
      idempotencyKey: stableServiceAreaKey(serviceAreaCode, input),
    },
  );
  return result.serviceArea;
}
