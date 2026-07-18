import { getIdentityAccessToken } from "@bthwani/core-identity";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import type {
  DshAddressMutationContext,
  DshAddressTransportError,
  DshClientAddress,
  DshClientAddressDraft,
  DshUpdateClientAddressInput,
} from "./client-address.types";

const baseUrl = resolveDshApiBaseUrl();
const cookieMode = baseUrl.startsWith("/");

function requestUrl(path: string): string | URL {
  return cookieMode
    ? `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`
    : new URL(path, baseUrl);
}

async function parse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const raw = await response.text().catch(() => "");
    let code: string | undefined;
    let message = raw || `HTTP ${response.status}`;
    try {
      const value = JSON.parse(raw) as { code?: unknown; message?: unknown };
      if (typeof value.code === "string") code = value.code;
      if (typeof value.message === "string") message = value.message;
    } catch {
      // Keep the non-JSON response text without converting the request to success.
    }
    throw {
      kind: "http",
      status: response.status,
      ...(code ? { code } : {}),
      message,
    } satisfies DshAddressTransportError;
  }
  if (response.status === 204) return undefined as T;
  try {
    return (await response.json()) as T;
  } catch {
    throw {
      kind: "invalid_response",
      message: "تعذر قراءة استجابة دفتر العناوين.",
    } satisfies DshAddressTransportError;
  }
}

async function request<T>(
  path: string,
  options: {
    readonly method?: "GET" | "POST" | "PATCH" | "DELETE";
    readonly body?: unknown;
    readonly mutation?: DshAddressMutationContext;
    readonly expectedVersion?: number;
  } = {},
): Promise<T> {
  const token = cookieMode ? undefined : getIdentityAccessToken();
  if (!cookieMode && !token) {
    throw { kind: "http", status: 401, message: "تسجيل الدخول مطلوب." } satisfies DshAddressTransportError;
  }
  let response: Response;
  try {
    response = await fetch(requestUrl(path), {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(options.mutation
          ? {
              "Idempotency-Key": options.mutation.idempotencyKey,
              "X-Correlation-ID": options.mutation.correlationId,
            }
          : {}),
        ...(options.expectedVersion !== undefined
          ? { "If-Match-Version": String(options.expectedVersion) }
          : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      ...(cookieMode ? { credentials: "include" as const } : {}),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    throw {
      kind: "network",
      message: error instanceof Error ? error.message : "تعذر الاتصال بخدمة العناوين.",
    } satisfies DshAddressTransportError;
  }
  return parse<T>(response);
}

export async function listDshClientAddresses(): Promise<readonly DshClientAddress[]> {
  const result = await request<{ addresses: DshClientAddress[] }>("/dsh/client/addresses");
  return result.addresses;
}

export async function createDshClientAddress(
  input: DshClientAddressDraft,
  mutation: DshAddressMutationContext,
): Promise<DshClientAddress> {
  const result = await request<{ address: DshClientAddress }>("/dsh/client/addresses", {
    method: "POST",
    body: input,
    mutation,
  });
  return result.address;
}

export async function updateDshClientAddress(
  addressId: string,
  input: DshUpdateClientAddressInput,
  correlationId: string,
): Promise<DshClientAddress> {
  const result = await request<{ address: DshClientAddress }>(
    `/dsh/client/addresses/${encodeURIComponent(addressId)}`,
    {
      method: "PATCH",
      body: input,
      mutation: {
        idempotencyKey: `address-update:${addressId}:v${input.expectedVersion}`,
        correlationId,
      },
    },
  );
  return result.address;
}

export async function deleteDshClientAddress(
  addressId: string,
  expectedVersion: number,
  correlationId: string,
): Promise<void> {
  await request<void>(`/dsh/client/addresses/${encodeURIComponent(addressId)}`, {
    method: "DELETE",
    expectedVersion,
    mutation: {
      idempotencyKey: `address-delete:${addressId}:v${expectedVersion}`,
      correlationId,
    },
  });
}

export async function setDshClientDefaultAddress(
  addressId: string,
  mutation: DshAddressMutationContext,
): Promise<DshClientAddress> {
  const result = await request<{ address: DshClientAddress }>(
    `/dsh/client/addresses/${encodeURIComponent(addressId)}/default`,
    { method: "POST", mutation },
  );
  return result.address;
}
