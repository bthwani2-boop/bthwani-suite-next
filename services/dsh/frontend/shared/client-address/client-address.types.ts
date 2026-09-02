import type { paths } from "@bthwani/dsh/openapi";

type ClientAddressCollection = paths["/dsh/client/addresses"];
type ClientAddressItem = paths["/dsh/client/addresses/{addressId}"];
type ListClientAddressesResponse =
  ClientAddressCollection["get"]["responses"][200]["content"]["application/json"];
type CreateClientAddressInput = NonNullable<
  ClientAddressCollection["post"]["requestBody"]
>["content"]["application/json"];
type UpdateClientAddressInput = NonNullable<
  ClientAddressItem["patch"]["requestBody"]
>["content"]["application/json"];

/**
 * Runtime addresses serialize every declared address property. OpenAPI remains
 * the schema authority; Required only reflects the concrete DSH response
 * projection consumed by this adapter.
 */
export type DshClientAddress = Readonly<
  Required<ListClientAddressesResponse["addresses"][number]>
>;

/**
 * Editable/validation-stage form derived from the canonical create request.
 * Coordinates may be absent only until validateClientAddressDraft rejects the
 * incomplete candidate; all other request fields follow OpenAPI directly.
 */
export type DshClientAddressDraft = Readonly<
  Omit<CreateClientAddressInput, "latitude" | "longitude"> &
  Partial<Pick<CreateClientAddressInput, "latitude" | "longitude">>
>;

/** Update payload derives from the canonical update request with the same pre-validation coordinate allowance. */
export type DshUpdateClientAddressInput = Readonly<
  Omit<UpdateClientAddressInput, "latitude" | "longitude"> &
  Partial<Pick<UpdateClientAddressInput, "latitude" | "longitude">>
>;

export type DshAddressMutationContext = {
  readonly idempotencyKey: string;
  readonly correlationId: string;
};

export type DshAddressTransportError = {
  readonly kind: "http" | "network" | "invalid_response";
  readonly status?: number;
  readonly code?: string;
  readonly message: string;
};
