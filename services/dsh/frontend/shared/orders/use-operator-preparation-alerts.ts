import React from 'react';
import { classifyOrderError } from './orders.api';
import {
  acknowledgeOrderPreparationAlert,
  fetchOrderPreparationAlerts,
  refreshOrderPreparationAlerts,
} from './order-preparation-alerts.api';
import type {
  DshPreparationAlert,
  DshRefreshPreparationAlertsResult,
} from './order-preparation-alerts.types';

export type OperatorPreparationAlertsState =
  | { readonly kind: 'loading'; readonly alerts: readonly DshPreparationAlert[] }
  | { readonly kind: 'ready'; readonly alerts: readonly DshPreparationAlert[]; readonly lastScan?: DshRefreshPreparationAlertsResult }
  | { readonly kind: 'submitting'; readonly alerts: readonly DshPreparationAlert[]; readonly action: 'scan' | 'acknowledge' }
  | { readonly kind: 'offline'; readonly alerts: readonly DshPreparationAlert[]; readonly message: string }
  | { readonly kind: 'forbidden'; readonly alerts: readonly DshPreparationAlert[]; readonly message: string }
  | { readonly kind: 'conflict'; readonly alerts: readonly DshPreparationAlert[]; readonly message: string }
  | { readonly kind: 'error'; readonly alerts: readonly DshPreparationAlert[]; readonly message: string };

function failureState(
  error: unknown,
  alerts: readonly DshPreparationAlert[],
): Exclude<OperatorPreparationAlertsState, { readonly kind: 'loading' | 'ready' | 'submitting' }> {
  const classified = classifyOrderError(error);
  if (classified.kind === 'offline') {
    return { kind: 'offline', alerts, message: 'تعذر الاتصال بتنبيهات تجهيز الطلبات.' };
  }
  if (classified.kind === 'permission_denied') {
    return { kind: 'forbidden', alerts, message: 'لا تسمح صلاحية الحساب بقراءة أو إدارة تنبيهات التجهيز.' };
  }
  if (classified.kind === 'conflict') {
    return { kind: 'conflict', alerts, message: 'تغير التنبيه أثناء المعالجة. أعد تحميل القائمة.' };
  }
  return { kind: 'error', alerts, message: classified.message ?? 'تعذر تنفيذ عملية التنبيهات.' };
}

export function useOperatorPreparationAlerts() {
  const [state, setState] = React.useState<OperatorPreparationAlertsState>({
    kind: 'loading',
    alerts: [],
  });

  const load = React.useCallback(async () => {
    try {
      const alerts = await fetchOrderPreparationAlerts(undefined, 100);
      setState({ kind: 'ready', alerts });
    } catch (error) {
      setState((current) => failureState(error, current.alerts));
    }
  }, []);

  const scan = React.useCallback(async () => {
    setState((current) => ({ kind: 'submitting', alerts: current.alerts, action: 'scan' }));
    try {
      const lastScan = await refreshOrderPreparationAlerts();
      const alerts = await fetchOrderPreparationAlerts(undefined, 100);
      setState({ kind: 'ready', alerts, lastScan });
    } catch (error) {
      setState((current) => failureState(error, current.alerts));
    }
  }, []);

  const acknowledge = React.useCallback(async (alert: DshPreparationAlert) => {
    setState((current) => ({ kind: 'submitting', alerts: current.alerts, action: 'acknowledge' }));
    try {
      const expectedVersion = alert.version;
      await acknowledgeOrderPreparationAlert(alert.id, expectedVersion);
      const alerts = await fetchOrderPreparationAlerts(undefined, 100);
      setState({ kind: 'ready', alerts });
    } catch (error) {
      setState((current) => failureState(error, current.alerts));
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return { state, load, scan, acknowledge } as const;
}
