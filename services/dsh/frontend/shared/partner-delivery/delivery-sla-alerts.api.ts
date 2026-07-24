import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "partner-delivery-sla-alerts");

export type DshDeliverySLAAlertStatus = "open" | "acknowledged" | "resolved";

export type DshDeliverySLAAlert = {
  readonly id: string;
  readonly taskId: string;
  readonly orderId: string;
  readonly storeId: string;
  readonly leg: string;
  readonly status: DshDeliverySLAAlertStatus;
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

export async function refreshDeliverySLAAlerts(): Promise<DshRefreshSLAAlertsResult> {
  const response = await request<{ result: DshRefreshSLAAlertsResult }>(
    "/dsh/operator/partner-delivery/sla-alerts/refresh",
    { method: "POST", body: {} },
  );
  return response.result;
}

export async function fetchDeliverySLAAlerts(params: {
  readonly status?: DshDeliverySLAAlertStatus;
  readonly limit?: number;
} = {}): Promise<readonly DshDeliverySLAAlert[]> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  const qs = query.toString();
  const response = await request<{ alerts: readonly DshDeliverySLAAlert[] }>(
    `/dsh/operator/partner-delivery/sla-alerts${qs ? `?${qs}` : ""}`,
  );
  return response.alerts;
}

export async function acknowledgeDeliverySLAAlert(
  alertId: string,
  expectedVersion: number,
): Promise<DshDeliverySLAAlert> {
  const response = await request<{ alert: DshDeliverySLAAlert }>(
    `/dsh/operator/partner-delivery/sla-alerts/${encodeURIComponent(alertId)}/acknowledge`,
    { method: "POST", body: { expectedVersion } },
  );
  return response.alert;
}
