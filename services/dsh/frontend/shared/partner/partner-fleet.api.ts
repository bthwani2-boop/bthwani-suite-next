import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";

const httpClient = createDshHttpClient(resolveDshApiBaseUrl(), "partner-fleet");

function request<T>(
  path: string,
  options: { readonly method?: "GET" | "POST"; readonly body?: unknown } = {},
): Promise<T> {
  return httpClient.request<T>(path, options);
}

export type DshCourierConnectionStatus = "pending" | "redeemed" | "revoked" | "expired";

export type DshCourierConnection = {
  readonly id: string;
  readonly storeId: string;
  readonly teamMemberId: string;
  readonly codeLast4: string;
  readonly status: DshCourierConnectionStatus;
  readonly expiresAt: string;
  readonly createdByActorId: string;
  readonly redeemedByCaptainActorId?: string;
  readonly redeemedAt?: string;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshIssuedCourierConnection = {
  readonly connection: DshCourierConnection;
  /** Returned once. The backend stores only a SHA-256 digest and last four. */
  readonly code: string;
};

export type DshCaptainFleetMembership = {
  readonly teamMemberId: string;
  readonly storeId: string;
  readonly storeName: string;
  readonly courierName: string;
  readonly status: string;
  readonly branchAssignment: string;
  readonly deliveryAssignment: string;
  readonly version: number;
};

export function issuePartnerCourierConnectionCode(
  storeId: string,
  memberId: string,
  expiresInHours = 24,
): Promise<{ issued: DshIssuedCourierConnection }> {
  return request(`/dsh/partner/stores/${storeId}/couriers/${memberId}/connection-code`, {
    method: "POST",
    body: { expiresInHours },
  });
}

export function listPartnerCourierConnections(
  storeId: string,
): Promise<{ connections: DshCourierConnection[] }> {
  return request(`/dsh/partner/stores/${storeId}/courier-connections`);
}

export function revokePartnerCourierConnection(
  storeId: string,
  connectionId: string,
  expectedVersion: number,
): Promise<{ connection: DshCourierConnection }> {
  return request(`/dsh/partner/stores/${storeId}/courier-connections/${connectionId}/revoke`, {
    method: "POST",
    body: { expectedVersion },
  });
}

export function connectCaptainToPartnerFleet(
  code: string,
): Promise<{ membership: DshCaptainFleetMembership }> {
  return request("/dsh/captain/partner-fleet/connect", {
    method: "POST",
    body: { code },
  });
}

export function listCaptainPartnerFleetMemberships(): Promise<{
  memberships: DshCaptainFleetMembership[];
}> {
  return request("/dsh/captain/partner-fleet/memberships");
}
