'use client';

import React from 'react';
import { Badge, Box, Button, Divider, StateView, Text } from '@bthwani/ui-kit';
import {
  acknowledgePickupSLAAlert,
  fetchPickupSLAAlerts,
  refreshPickupSLAAlerts,
  type DshPickupSLAAlert,
  type DshRefreshSLAAlertsResult,
} from '../../shared/pickup/pickup-sla-alerts.api';

const LEG_LABELS: Record<string, string> = {
  awaiting_notify: 'بانتظار إشعار العميل',
  notified_to_arrival: 'بانتظار وصول العميل',
  arrived_to_verify: 'بانتظار التحقق من الرمز',
};

/** Persisted, acknowledgeable SLA breach alerts for self-pickup sessions. */
export function PickupSLAAlertsPanel({
  onOpenOrder,
}: {
  readonly onOpenOrder: (orderId: string) => void;
}) {
  const [alerts, setAlerts] = React.useState<readonly DshPickupSLAAlert[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [lastScan, setLastScan] = React.useState<DshRefreshSLAAlertsResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const data = await fetchPickupSLAAlerts({ limit: 100 });
      setAlerts(data);
      setLoaded(true);
      setError(null);
    } catch {
      setError('تعذر تحميل تنبيهات SLA للاستلام الذاتي.');
      setLoaded(true);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const scan = React.useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await refreshPickupSLAAlerts();
      setLastScan(result);
      await load();
    } catch {
      setError('تعذر تشغيل فحص SLA للاستلام الذاتي.');
    }
    setBusy(false);
  }, [load]);

  const acknowledge = React.useCallback(async (alert: DshPickupSLAAlert) => {
    setBusy(true);
    setError(null);
    try {
      await acknowledgePickupSLAAlert(alert.id, alert.version);
      await load();
    } catch {
      setError('تعذر إقرار مراجعة التنبيه.');
    }
    setBusy(false);
  }, [load]);

  const activeAlerts = alerts.filter((a) => a.status !== 'resolved');

  return (
    <Box gap={3}>
      <Box layoutDirection="row" justify="space-between" align="center">
        <Box gap={1}>
          <Text role="label">تنبيهات SLA — الاستلام الذاتي</Text>
          <Text role="bodySm" tone="muted">تُحفظ التنبيهات في DSH وتغلق تلقائيًا عند زوال سببها.</Text>
        </Box>
        <Button label={busy ? 'جارٍ فحص SLA…' : 'فحص SLA الآن'} tone="secondary" disabled={busy} onPress={() => void scan()} />
      </Box>

      {!loaded ? <StateView stateId="loading" title="جارٍ تحميل تنبيهات SLA" /> : null}
      {error ? (
        <StateView stateId="recoverableError" tone="danger" title="تعذر تحديث التنبيهات" description={error} actionLabel="إعادة التحميل" onActionPress={() => void load()} />
      ) : null}
      {lastScan ? (
        <Text role="caption" tone="muted">{`فتح ${lastScan.opened} · أغلق ${lastScan.resolved} · نشط ${lastScan.active}`}</Text>
      ) : null}

      {activeAlerts.length === 0 && loaded ? (
        <StateView stateId="empty" title="لا توجد تنبيهات SLA نشطة" description="شغّل فحص SLA للتحقق من الجلسات الحالية." />
      ) : (
        <Box gap={2}>
          {activeAlerts.map((alert, index) => (
            <React.Fragment key={alert.id}>
              {index > 0 ? <Divider /> : null}
              <Box gap={2}>
                <Box layoutDirection="row" justify="space-between" align="center">
                  <Text role="bodyStrong">{LEG_LABELS[alert.leg] ?? alert.leg}</Text>
                  <Badge label={alert.status === 'open' ? 'مفتوح' : 'مُقرّ'} tone="danger" />
                </Box>
                <Text role="bodySm" tone="muted">{`الطلب: ${alert.orderId}`}</Text>
                <Text role="caption" tone="muted">{`المتجر: ${alert.storeId} · اكتشف: ${new Date(alert.detectedAt).toLocaleString('ar-YE')}`}</Text>
                <Box layoutDirection="row" gap={2}>
                  <Button label="فتح الطلب" tone="secondary" disabled={busy} onPress={() => onOpenOrder(alert.orderId)} />
                  {alert.status === 'open' ? (
                    <Button label={busy ? 'جارٍ الإقرار…' : 'إقرار المراجعة'} tone="brand" disabled={busy} onPress={() => void acknowledge(alert)} />
                  ) : null}
                </Box>
              </Box>
            </React.Fragment>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default PickupSLAAlertsPanel;
