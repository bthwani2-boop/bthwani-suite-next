import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { corrId, createDshHttpClient } from "../_kernel/dsh-http-request";

const httpClient = createDshHttpClient(resolveDshApiBaseUrl(), "partner-fleet");

export type DshPartnerFleetMutationContext = {
  readonly idempotencyKey: string;
  readonly correlationId: string;
};

function request<T>(
  path: string,
    options: {
      readonly method?: "GET" | "POST";
      readonly body?: unknown;
      readonly idempotencyKey?: string;
      readonly correlationId?: string;
      readonly mutationContext?: DshPartnerFleetMutationContext;
    } = {},
): Promise<T> {
  return httpClient.request<T>(path, {
    ...options,
    idempotencyKey: options.method === "POST"
      ? options.mutationContext?.idempotencyKey ?? options.idempotencyKey ?? corrId("partner-fleet")
      : undefined,
    correlationId: options.mutationContext?.correlationId ?? options.correlationId,
  });
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
  readonly status: "invited" | "active" | "suspended";
  readonly branchAssignment: string;
  readonly deliveryAssignment: string;
  readonly version: number;
};

export type DshOperatorStoreFleetMember = {
  readonly teamMemberId: string;
  readonly storeId: string;
  readonly courierName: string;
  readonly status: "invited" | "active" | "suspended";
  readonly captainActorId?: string;
  readonly branchAssignment: string;
  readonly deliveryAssignment: string;
  readonly version: number;
};

export type DshOperatorPartnerFleetSnapshot = {
  readonly storeId: string;
  readonly connections: readonly DshCourierConnection[];
  readonly members: readonly DshOperatorStoreFleetMember[];
};

export function fetchOperatorCaptainFleetMemberships(captainId: string): Promise<{ readonly memberships: readonly DshCaptainFleetMembership[] }> {
  return request(`operator/captains/${captainId}/partner-fleet`, { method: "GET" });
}

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
  mutationContext: DshPartnerFleetMutationContext,
): Promise<{ membership: DshCaptainFleetMembership }> {
  return request("/dsh/captain/partner-fleet/connect", {
    method: "POST",
    body: { code },
    mutationContext,
  });
}

export function listCaptainPartnerFleetMemberships(): Promise<{
  memberships: DshCaptainFleetMembership[];
}> {
  return request("/dsh/captain/partner-fleet/memberships");
}

export function disconnectCaptainPartnerFleetMembership(
  membership: Pick<DshCaptainFleetMembership, "teamMemberId" | "storeId" | "version">,
  mutationContext: DshPartnerFleetMutationContext,
): Promise<{ membership: DshCaptainFleetMembership }> {
  return request(
    `/dsh/captain/partner-fleet/memberships/${membership.teamMemberId}/disconnect`,
    {
      method: "POST",
      body: {
        storeId: membership.storeId,
        expectedVersion: membership.version,
      },
      mutationContext,
    },
  );
}

export function fetchOperatorPartnerFleetSnapshot(
  storeId: string,
): Promise<DshOperatorPartnerFleetSnapshot> {
  return request(`/dsh/operator/stores/${storeId}/partner-fleet`);
}
