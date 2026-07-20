'use client';

import React from 'react';
import { Box, Button, Text } from '@bthwani/ui-kit';
import {
  cancelOperatorOrder,
  operatorOrderWorkboardErrorMessage,
  type OperatorOrderWorkboardRow,
} from '../../shared/operations/order-workboard.api';

export type OrderJourneyOperatorInterventionProps = {
  readonly order: OperatorOrderWorkboardRow;
  readonly onChanged: () => void | Promise<void>;
};

export function OrderJourneyOperatorIntervention({
  order,
  onChanged,
}: OrderJourneyOperatorInterventionProps) {
  const [reason, setReason] = React.useState('');
  const [state, setState] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = React.useState('');
  const terminal = order.status === 'delivered' || order.status === 'cancelled';

  React.useEffect(() => {
    setReason('');
    setState('idle');
    setMessage('');
  }, [order.id]);

  if (terminal) {
    return (
      <Box padding={3} background="surfaceInset" radiusToken="sm">
        <Text role="bodySm" tone="muted">الطلب في حالة نهائية ولا يقبل تدخلاً تشغيليًا جديدًا.</Text>
      </Box>
    );
  }

  const submit = async () => {
    if (!reason.trim()) {
      setState('error');
      setMessage('سبب الإلغاء مطلوب.');
      return;
    }
    setState('loading');
    setMessage('');
    try {
      await cancelOperatorOrder(order.id, reason);
      await onChanged();
      setState('success');
      setReason('');
      setMessage('تم تثبيت الإلغاء في DSH وتحديث لوحة الرحلة.');
    } catch (error) {
      setState('error');
      setMessage(operatorOrderWorkboardErrorMessage(error));
    }
  };

  return (
    <Box gap={2} padding={4} background="surfaceInset" radiusToken="md">
      <Text role="titleSm">تدخل تشغيلي محكوم</Text>
      <Text role="bodySm" tone="muted">الإلغاء يحتاج سببًا مسجلاً، ولا يغيّر الحقيقة المالية مباشرة.</Text>
      <input
        type="text"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="سبب الإلغاء التشغيلي"
        aria-label="سبب إلغاء الطلب"
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid var(--bthwani-control-panel-border)',
          borderRadius: '8px',
          background: 'var(--bthwani-control-panel-surface-base)',
        }}
      />
      {message ? <Text role="bodySm" tone={state === 'error' ? 'danger' : 'success'}>{message}</Text> : null}
      <Button
        label={state === 'loading' ? 'جارٍ تثبيت الإلغاء…' : 'إلغاء الطلب مع السبب'}
        tone="danger"
        disabled={state === 'loading' || !reason.trim()}
        onPress={() => void submit()}
      />
    </Box>
  );
}
