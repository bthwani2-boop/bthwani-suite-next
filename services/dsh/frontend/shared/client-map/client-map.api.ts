import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type {
  DshMapReverseInput,
  DshMapSearchInput,
  DshVerifiedMapLocation,
} from "./client-map.types";

const { request } = createDshHttpClient(
  resolveDshApiBaseUrl(),
  "dsh-client-map",
);

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
