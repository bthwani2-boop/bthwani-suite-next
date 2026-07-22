import { resolveDshApiBaseUrl } from '../_kernel/dsh-api-base-url';
import { createDshHttpClient } from '../_kernel/dsh-http-request';
import type {
  DshPreparationAlert,
  DshPreparationAlertStatus,
  DshRefreshPreparationAlertsResult,
} from './order-preparation-alerts.types';

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), 'order-preparation-alert');

export async function refreshOrderPreparationAlerts(): Promise<DshRefreshPreparationAlertsResult> {
  const data = await request<{ result: DshRefreshPreparationAlertsResult }>(
    '/dsh/operator/order-preparation/alerts/refresh',
    { method: 'POST' },
  );
  return data.result;
}

export async function fetchOrderPreparationAlerts(
  status?: DshPreparationAlertStatus,
  limit = 100,
): Promise<readonly DshPreparationAlert[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  params.set('limit', String(limit));
  const data = await request<{ alerts: DshPreparationAlert[] }>(
    `/dsh/operator/order-preparation/alerts?${params.toString()}`,
  );
  return data.alerts ?? [];
}

export async function acknowledgeOrderPreparationAlert(
  alertId: string,
  expectedVersion: number,
): Promise<DshPreparationAlert> {
  const data = await request<{ alert: DshPreparationAlert }>(
    `/dsh/operator/order-preparation/alerts/${encodeURIComponent(alertId)}/acknowledge`,
    { method: 'POST', body: { expectedVersion } },
  );
  return data.alert;
}
