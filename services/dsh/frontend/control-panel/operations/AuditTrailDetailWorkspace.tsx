'use client';

import React from 'react';
import { Box, KeyValueList, Surface, Text } from '@bthwani/ui-kit';
import { WebControlPanelInspectorShell } from '@bthwani/ui-kit/web';
import type { OrderTruth } from '../../shared/order-truth';

export type AuditTrailDetailWorkspaceProps = {
  readonly orderId?: string | undefined;
  readonly order?: OrderTruth | undefined;
  readonly onClose?: (() => void) | undefined;
};

/**
 * Fail-closed operational inspector.
 *
 * DSH currently exposes an order runtime read model, not a canonical audit-entry
 * API for this workspace. The component therefore displays only returned order
 * facts and never manufactures actors, permissions, decisions, reasons, or
 * evidence locally.
 */
export function AuditTrailDetailWorkspace({
  orderId = '—',
  order,
  onClose,
}: AuditTrailDetailWorkspaceProps) {
  const title = `مراجعة تشغيلية — ${order?.id ?? orderId}`;

  return (
    <WebControlPanelInspectorShell title={title} onClose={onClose ?? (() => undefined)}>
      <Box gap={4} padding={4}>
        {!order ? (
          <Surface tone="warning" padding={3}>
            <Text role="bodySm" tone="warning">
              لا توجد أدلة تدقيق خادمية لهذا العنصر. تم إيقاف العرض المحلي المصطنع حتى يوفّر DSH عقد تدقيق فعليًا بهوية المنفّذ والقرار والسبب والأدلة.
            </Text>
          </Surface>
        ) : (
          <>
            <Surface tone="warning" padding={3}>
              <Text role="bodySm" tone="warning">
                المعروض أدناه حقائق تشغيلية من DSH Runtime، وليس سجل تدقيق. لا يُستنتج منها منفّذ أو صلاحية أو قرار تدقيق.
              </Text>
            </Surface>

            <KeyValueList
              items={[
                { label: 'معرّف الطلب', value: order.id },
                { label: 'رقم الطلب', value: order.orderNumber },
                { label: 'المتجر', value: order.storeId },
                { label: 'العميل', value: order.clientId ?? 'غير متاح في نطاق العمليات' },
                { label: 'طريقة التنفيذ', value: order.fulfillmentMode },
                { label: 'الحالة التشغيلية', value: order.status },
                { label: 'المالك الحالي', value: order.currentOwner },
                { label: 'الإجراءات المسموحة', value: String(order.allowedActions.length) },
                { label: 'حالة إسقاط الدفع', value: order.paymentStatusProjection },
                { label: 'أحداث الحالة', value: String(order.statusTimeline.length) },
                { label: 'آخر تحديث', value: new Date(order.updatedAt).toLocaleString('ar-YE') },
              ]}
            />
          </>
        )}
      </Box>
    </WebControlPanelInspectorShell>
  );
}
