import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "pickup-sla-alerts");

export type DshPickupSLAAlertStatus = "open" | "acknowledged" | "resolved";

export type DshPickupSLAAlert = {
  readonly id: string;
  readonly sessionId: string;
  readonly orderId: string;
  readonly storeId: string;
  readonly leg: string;
  readonly status: DshPickupSLAAlertStatus;
  readonly detectedAt: string;
  readonly acknowledgedByActorId: string | null;
  readonly acknowledgedAt: string | null;
  readonly resolvedAt: string | null;
  readonly version: number;
};

export type DshRefreshSLAAlertsResult = {
  readonly opened: number;
  readonly resolved: number;
  readonly active: number;
};

export async function refreshPickupSLAAlerts(): Promise<DshRefreshSLAAlertsResult> {
  const response = await request<{ result: DshRefreshSLAAlertsResult }>(
    "/dsh/operator/pickups/sla-alerts/refresh",
    { method: "POST", body: {} },
  );
  return response.result;
}

export async function fetchPickupSLAAlerts(params: {
  readonly status?: DshPickupSLAAlertStatus;
  readonly limit?: number;
} = {}): Promise<readonly DshPickupSLAAlert[]> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  const qs = query.toString();
  const response = await request<{ alerts: readonly DshPickupSLAAlert[] }>(
    `/dsh/operator/pickups/sla-alerts${qs ? `?${qs}` : ""}`,
  );
  return response.alerts;
}

export async function acknowledgePickupSLAAlert(
  alertId: string,
  expectedVersion: number,
): Promise<DshPickupSLAAlert> {
  const response = await request<{ alert: DshPickupSLAAlert }>(
    `/dsh/operator/pickups/sla-alerts/${encodeURIComponent(alertId)}/acknowledge`,
    { method: "POST", body: { expectedVersion } },
  );
  return response.alert;
}
