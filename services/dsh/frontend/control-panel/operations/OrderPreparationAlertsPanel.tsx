'use client';

import React from 'react';
import { Badge, Box, Button, Divider, StateView, Text } from '@bthwani/ui-kit';
import {
  PREPARATION_ALERT_KIND_LABELS,
  PREPARATION_ALERT_STATUS_LABELS,
  useOperatorPreparationAlerts,
} from '../../shared/orders';

export function OrderPreparationAlertsPanel({
  onOpenOrder,
}: {
  readonly onOpenOrder: (orderId: string) => void;
}) {
  const controller = useOperatorPreparationAlerts();
  const { state } = controller;
  const submitting = state.kind === 'submitting';
  const activeAlerts = state.alerts.filter((alert) => alert.status !== 'resolved');

  return (
    <Box gap={3}>
      <Box layoutDirection="row" justify="space-between" align="center">
        <Box gap={1}>
          <Text role="label">تنبيهات التجهيز والتصعيد</Text>
          <Text role="bodySm" tone="muted">
            تُحفظ التنبيهات في DSH وتغلق تلقائيًا عند زوال سببها.
          </Text>
        </Box>
        <Button
          label={submitting && state.action === 'scan' ? 'جارٍ فحص SLA…' : 'فحص SLA الآن'}
          tone="secondary"
          disabled={submitting}
          onPress={() => void controller.scan()}
        />
      </Box>

      {state.kind === 'loading' ? (
        <StateView stateId="loading" title="جارٍ تحميل تنبيهات التجهيز" />
      ) : null}
      {state.kind === 'offline' || state.kind === 'forbidden' || state.kind === 'conflict' || state.kind === 'error' ? (
        <StateView
          stateId={state.kind === 'offline' ? 'offline' : state.kind === 'forbidden' ? 'forbidden' : 'recoverableError'}
          tone={state.kind === 'offline' || state.kind === 'forbidden' ? 'warning' : 'danger'}
          title={state.kind === 'forbidden' ? 'إدارة التنبيهات غير مصرح بها' : 'تعذر تحديث التنبيهات'}
          description={state.message}
          actionLabel="إعادة التحميل"
          onActionPress={() => void controller.load()}
        />
      ) : null}
      {state.kind === 'ready' && state.lastScan ? (
        <Text role="caption" tone="muted">
          {`فتح ${state.lastScan.opened} · أغلق ${state.lastScan.resolved} · نشط ${state.lastScan.active}`}
        </Text>
      ) : null}

      {activeAlerts.length === 0 && state.kind !== 'loading' ? (
        <StateView
          stateId="empty"
          title="لا توجد تنبيهات تجهيز نشطة"
          description="شغّل فحص SLA للتحقق من الطلبات الحالية."
        />
      ) : (
        <Box gap={2}>
          {activeAlerts.map((alert, index) => (
            <React.Fragment key={alert.id}>
              {index > 0 ? <Divider /> : null}
              <Box gap={2}>
                <Box layoutDirection="row" justify="space-between" align="center">
                  <Text role="bodyStrong">{PREPARATION_ALERT_KIND_LABELS[alert.kind]}</Text>
                  <Badge
                    label={PREPARATION_ALERT_STATUS_LABELS[alert.status]}
                    tone={alert.kind === 'overdue' ? 'danger' : 'warning'}
                  />
                </Box>
                <Text role="bodySm" tone="muted">{`الطلب: ${alert.orderId}`}</Text>
                <Text role="caption" tone="muted">
                  {`المتجر: ${alert.storeId} · اكتشف: ${new Date(alert.detectedAt).toLocaleString('ar-YE')}`}
                </Text>
                <Box layoutDirection="row" gap={2}>
                  <Button
                    label="فتح الطلب"
                    tone="secondary"
                    disabled={submitting}
                    onPress={() => onOpenOrder(alert.orderId)}
                  />
                  {alert.status === 'open' ? (
                    <Button
                      label={submitting && state.action === 'acknowledge' ? 'جارٍ الإقرار…' : 'إقرار المراجعة'}
                      tone="brand"
                      disabled={submitting}
                      onPress={() => void controller.acknowledge(alert)}
                    />
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
