import { getIdentityAccessToken } from "@bthwani/core-identity";
import { corrId, createDshFlexibleHttpClient } from "../_kernel/dsh-http-request";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import type { DshHomeAdminKind } from "./home-discovery.types";

export type DshHomeAudienceTargets =
  | readonly []
  | readonly ["guest"]
  | readonly ["authenticated"]
  | readonly ["guest", "authenticated"]
  | readonly ["authenticated", "guest"];

export type DshHomeAdminTargeting = Readonly<{
  cityCodes: readonly string[];
  serviceAreaCodes: readonly string[];
  audienceSegments: DshHomeAudienceTargets;
}>;

type RawDshHomeAdminTargeting = Readonly<{
  cityCodes: readonly string[];
  serviceAreaCodes: readonly string[];
  audienceSegments: readonly string[];
}>;

export const EMPTY_HOME_ADMIN_TARGETING: DshHomeAdminTargeting = {
  cityCodes: [],
  serviceAreaCodes: [],
  audienceSegments: [],
};

const httpClient = createDshFlexibleHttpClient(resolveDshApiBaseUrl());

function tokenOptions(): { readonly token?: string } {
  const token = getIdentityAccessToken();
  return token === null ? {} : { token };
}

function mutationOptions() {
  const token = getIdentityAccessToken();
  const correlationId = corrId("home-targeting");
  return {
    auth: {
      ...(token === null ? {} : { accessToken: token }),
      idempotencyKey: correlationId,
      correlationId,
    },
  } as const;
}

function endpoint(kind: DshHomeAdminKind, itemId: string): string {
  return `/dsh/operator/home-discovery/${kind}/${encodeURIComponent(itemId)}/targeting`;
}

export async function fetchHomeDiscoveryTargeting(
  kind: DshHomeAdminKind,
  itemId: string,
): Promise<DshHomeAdminTargeting> {
  const response = await httpClient.request<{ targeting: RawDshHomeAdminTargeting }>(
    endpoint(kind, itemId),
    tokenOptions(),
  );
  return normalizeTargeting(response.targeting);
}

export async function replaceHomeDiscoveryTargeting(
  kind: DshHomeAdminKind,
  itemId: string,
  targeting: DshHomeAdminTargeting,
): Promise<DshHomeAdminTargeting> {
  const response = await httpClient.request<{ targeting: RawDshHomeAdminTargeting }>(
    endpoint(kind, itemId),
    {
      method: "PUT",
      body: normalizeTargeting(targeting),
      ...mutationOptions(),
    },
  );
  return normalizeTargeting(response.targeting);
}

export function normalizeTargeting(targeting: RawDshHomeAdminTargeting): DshHomeAdminTargeting {
  const unique = (values: readonly string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
  const audiences = unique(targeting.audienceSegments)
    .filter((value): value is "guest" | "authenticated" => value === "guest" || value === "authenticated")
    .slice(0, 2) as DshHomeAudienceTargets;
  return {
    cityCodes: unique(targeting.cityCodes),
    serviceAreaCodes: unique(targeting.serviceAreaCodes),
    audienceSegments: audiences,
  };
}

export function parseTargetList(value: string): readonly string[] {
  return [...new Set(value.split(/[\s,،]+/).map((part) => part.trim()).filter(Boolean))].sort();
}

export function formatTargetList(values: readonly string[]): string {
  return values.join(", ");
}
