import { Platform } from "react-native";
import type { TokenResponse } from "@bthwani/core-identity";
import { isDshDeviceLoopbackBridgeEnabled } from "../_kernel/dsh-api-base-url";

function brokerBaseUrl(): string {
  return Platform.OS === "web" || isDshDeviceLoopbackBridgeEnabled()
    ? "http://127.0.0.1:58100"
    : "http://10.0.2.2:58100";
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
  const response = await fetch(`${brokerBaseUrl()}/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(brokerErrorCode(body));
  return body as TokenResponse;
}
