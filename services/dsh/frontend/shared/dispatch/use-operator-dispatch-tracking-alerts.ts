import React from 'react';
import { classifyDispatchError } from './dispatch.api';
import {
  fetchOperatorDispatchTrackingAlerts,
  type DshDispatchTrackingAlert,
} from './dispatch-tracking.api';

export type OperatorDispatchTrackingAlertsState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly alerts: readonly DshDispatchTrackingAlert[] }
  | { readonly kind: 'error'; readonly message: string };

export function useOperatorDispatchTrackingAlerts() {
  const [state, setState] = React.useState<OperatorDispatchTrackingAlertsState>({ kind: 'loading' });

  const load = React.useCallback(async () => {
    try {
      const alerts = await fetchOperatorDispatchTrackingAlerts();
      setState({ kind: 'ready', alerts });
    } catch (error) {
      const classified = classifyDispatchError(error);
      if (classified.kind === 'permission_denied') {
        setState({ kind: 'error', message: 'لا تملك صلاحية قراءة تنبيهات التتبع التشغيلي.' });
        return;
      }
      if (classified.kind === 'offline') {
        setState({ kind: 'error', message: 'تعذر الاتصال بخدمة تنبيهات التتبع.' });
        return;
      }
      setState({ kind: 'error', message: classified.message ?? 'تعذر تحميل تنبيهات التتبع.' });
    }
  }, []);

  React.useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 30_000);
    return () => clearInterval(interval);
  }, [load]);

  return { state, reload: load } as const;
}
