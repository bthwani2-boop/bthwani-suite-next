import type { TokenResponse } from "@bthwani/core-identity";
import { resolveDshLocalRuntimeHost } from "../_kernel/dsh-api-base-url";
import {
  resolveMobileDevGatewayBaseUrl,
  resolveMobileDevGatewayCapability,
} from "../_kernel/mobile-dev-gateway";

type BrokerTarget = {
  readonly baseUrl: string;
  readonly headers: Readonly<Record<string, string>>;
};

function brokerTarget(): BrokerTarget {
  const gateway = resolveMobileDevGatewayBaseUrl();
  if (gateway) {
    const capability = resolveMobileDevGatewayCapability();
    if (!capability) throw new Error("MOBILE_DEV_GATEWAY_CAPABILITY_MISSING");
    return {
      baseUrl: `${gateway}/__dev-session`,
      headers: { "X-Bthwani-Dev-Capability": capability },
    };
  }

  return {
    baseUrl: `http://${resolveDshLocalRuntimeHost()}:18100`,
    headers: {},
  };
}

function brokerErrorCode(body: unknown): string {
  if (
    typeof body === "object"
    && body !== null
    && "code" in body
    && typeof (body as { code?: unknown }).code === "string"
  ) {
    return (body as { code: string }).code;
  }
  return "DEV_SESSION_BROKER_UNAVAILABLE";
}

export async function requestDevelopmentSession(input: {
  readonly role: string;
  readonly surface: string;
  readonly deviceFingerprint: string;
}): Promise<TokenResponse> {
  const target = brokerTarget();
  const response = await fetch(`${target.baseUrl}/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...target.headers,
    },
    body: JSON.stringify(input),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(brokerErrorCode(body));
  return body as TokenResponse;
}
