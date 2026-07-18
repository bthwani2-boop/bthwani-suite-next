export type DshClientAddress = {
  readonly id: string;
  readonly label: string;
  readonly recipientName: string;
  readonly phoneE164: string;
  readonly addressLine: string;
  readonly serviceAreaCode: string;
  readonly building: string | null;
  readonly floor: string | null;
  readonly unit: string | null;
  readonly deliveryInstructions: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly isDefault: boolean;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshClientAddressDraft = {
  readonly label: string;
  readonly recipientName: string;
  readonly phoneE164: string;
  readonly addressLine: string;
  readonly serviceAreaCode: string;
  readonly building?: string;
  readonly floor?: string;
  readonly unit?: string;
  readonly deliveryInstructions?: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly makeDefault?: boolean;
};

export type DshUpdateClientAddressInput = DshClientAddressDraft & {
  readonly expectedVersion: number;
};

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
