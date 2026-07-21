import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type {
  DshAddressMutationContext,
  DshClientAddress,
  DshClientAddressDraft,
  DshUpdateClientAddressInput,
} from "./client-address.types";

const { request } = createDshHttpClient(
  resolveDshApiBaseUrl(),
  "dsh-client-address",
);

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
    idempotencyKey: mutation.idempotencyKey,
    correlationId: mutation.correlationId,
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
      idempotencyKey: `address-update:${addressId}:v${input.expectedVersion}`,
      correlationId,
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
    idempotencyKey: `address-delete:${addressId}:v${expectedVersion}`,
    correlationId,
  });
}

export async function setDshClientDefaultAddress(
  addressId: string,
  mutation: DshAddressMutationContext,
): Promise<DshClientAddress> {
  const result = await request<{ address: DshClientAddress }>(
    `/dsh/client/addresses/${encodeURIComponent(addressId)}/default`,
    {
      method: "POST",
      idempotencyKey: mutation.idempotencyKey,
      correlationId: mutation.correlationId,
    },
  );
  return result.address;
}
