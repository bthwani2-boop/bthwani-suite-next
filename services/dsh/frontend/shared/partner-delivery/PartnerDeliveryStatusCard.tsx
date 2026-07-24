'use client';

import React from 'react';
import { Badge, Box, Text } from '@bthwani/ui-kit';
import type { DshPartnerDeliveryTask } from './partner-delivery.types';

const STATUS_LABELS: Record<string, string> = {
  unassigned: 'غير مُسند',
  assigned: 'مُسند لموصل المتجر',
  departed: 'غادر المتجر',
  arrived: 'وصل إلى العميل',
  proof_pending: 'بانتظار إثبات التسليم',
  completed: 'مكتمل',
  cancelled: 'ملغى',
  exception: 'استثناء مسجل',
};

const SLA_TONE: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
  not_started: 'neutral',
  on_track: 'success',
  due_soon: 'warning',
  overdue: 'danger',
  closed: 'neutral',
};

const SLA_LABELS: Record<string, string> = {
  not_started: 'لم تبدأ المرحلة',
  on_track: 'ضمن الوقت',
  due_soon: 'قارب على الاستحقاق',
  overdue: 'تجاوز الوقت المحدد',
  closed: 'مغلقة',
};

function formatTime(value: string | null | undefined): string | null {
  if (!value) return null;
  return new Date(value).toLocaleString('ar-SA');
}

/**
 * Read-only monitoring card for a partner_delivery task. The operator
 * observes execution owned by the partner; no mutation lives here.
 */
export function PartnerDeliveryStatusCard({ task }: { readonly task: DshPartnerDeliveryTask }) {
  const slaState = task.slaState?.state ?? 'not_started';
  return (
    <Box gap={2} padding={4} background="surfaceInset" radiusToken="md">
      <Box layoutDirection="row" style={{ alignItems: 'center', gap: 8 } as never}>
        <Text role="titleSm">توصيل المتجر</Text>
        <Badge
          label={STATUS_LABELS[task.status] ?? task.status}
          tone={task.status === 'completed' ? 'success' : task.status === 'exception' || task.status === 'cancelled' ? 'danger' : 'action'}
        />
        <Badge label={SLA_LABELS[slaState] ?? slaState} tone={SLA_TONE[slaState] ?? 'neutral'} />
      </Box>
      <Box gap={1}>
        {formatTime(task.assignedAt) ? <Text role="caption" tone="muted">{`وقت الإسناد: ${formatTime(task.assignedAt)}`}</Text> : null}
        {formatTime(task.pickedUpAt) ? <Text role="caption" tone="muted">{`استلام الموصل: ${formatTime(task.pickedUpAt)}`}</Text> : null}
        {formatTime(task.departedAt) ? <Text role="caption" tone="muted">{`المغادرة: ${formatTime(task.departedAt)}`}</Text> : null}
        {formatTime(task.arrivedAt) ? <Text role="caption" tone="muted">{`الوصول للعميل: ${formatTime(task.arrivedAt)}`}</Text> : null}
        {formatTime(task.completedAt) ? <Text role="caption" tone="muted">{`الإغلاق: ${formatTime(task.completedAt)}`}</Text> : null}
        {task.exceptionReason ? <Text role="caption" tone="danger">{`سبب الاستثناء: ${task.exceptionReason}`}</Text> : null}
      </Box>
    </Box>
  );
}

export default PartnerDeliveryStatusCard;
