'use client';

import React from 'react';
import { Badge, Box, Button, Text } from '@bthwani/ui-kit';
import {
  FINANCIAL_CLOSURE_LABELS,
  OPERATOR_CANCELLATION_REASONS,
  type OperatorCancellationReasonCode,
} from '../../shared/orders';
import {
  cancelOperatorOrder,
  operatorOrderWorkboardErrorMessage,
  type OperatorOrderWorkboardRow,
} from '../../shared/operations/order-workboard.api';

export type OrderJourneyOperatorInterventionProps = {
  readonly order: OperatorOrderWorkboardRow;
  readonly onChanged: () => void | Promise<void>;
};

function financialTone(status: OperatorOrderWorkboardRow['financialClosureStatus']): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'failed') return 'danger';
  if (status === 'pending') return 'warning';
  if (status === 'refund_requested') return 'info';
  if (status === 'session_expired' || status === 'refund_completed' || status === 'no_action') return 'success';
  return 'neutral';
}

function isTerminal(status: string): boolean {
  return status === 'delivered'
    || status === 'cancelled'
    || status.startsWith('cancelled_')
    || status === 'failed_payment'
    || status === 'failed_dispatch';
}

export function OrderJourneyOperatorIntervention({
  order,
  onChanged,
}: OrderJourneyOperatorInterventionProps) {
  const [reasonCode, setReasonCode] = React.useState<OperatorCancellationReasonCode>('operational_failure');
  const [reasonNote, setReasonNote] = React.useState('');
  const [state, setState] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = React.useState('');
  const terminal = isTerminal(order.status);

  React.useEffect(() => {
    setReasonCode('operational_failure');
    setReasonNote('');
    setState('idle');
    setMessage('');
  }, [order.id]);

  if (terminal) {
    return (
      <Box gap={3} padding={4} background="surfaceInset" radiusToken="md">
        <Text role="titleSm">إغلاق الطلب</Text>
        <Text role="bodySm" tone="muted">الطلب في حالة نهائية ولا يقبل تدخلاً تشغيليًا جديدًا.</Text>
        {order.cancellationReasonCode ? (
          <Box gap={1}>
            <Text role="bodySm">{`السبب: ${order.cancellationReasonCode}`}</Text>
            {order.cancellationNote ? <Text role="caption" tone="muted">{order.cancellationNote}</Text> : null}
            {order.cancelledByRole ? <Text role="caption" tone="muted">{`الفاعل: ${order.cancelledByRole}`}</Text> : null}
          </Box>
        ) : null}
        <Badge
          label={FINANCIAL_CLOSURE_LABELS[order.financialClosureStatus]}
          tone={financialTone(order.financialClosureStatus)}
        />
        {order.financialClosureReference ? (
          <Text role="caption">{`المرجع المالي: ${order.financialClosureReference}`}</Text>
        ) : null}
        {order.financialClosureFailure ? (
          <Text role="bodySm" tone="danger">{order.financialClosureFailure}</Text>
        ) : null}
        {(order.financialClosureStatus === 'pending' || order.financialClosureStatus === 'failed') ? (
          <Button
            label="تحديث حالة الإغلاق المالي"
            tone="secondary"
            onPress={() => void onChanged()}
          />
        ) : null}
      </Box>
    );
  }

  const selectedReason = OPERATOR_CANCELLATION_REASONS.find((reason) => reason.code === reasonCode);
  const noteRequired = reasonCode === 'other';

  const submit = async () => {
    if (noteRequired && !reasonNote.trim()) {
      setState('error');
      setMessage('التوضيح مطلوب عند اختيار سبب آخر.');
      return;
    }
    setState('loading');
    setMessage('');
    try {
      await cancelOperatorOrder(order.id, reasonCode, reasonNote);
      await onChanged();
      setState('success');
      setReasonNote('');
      setMessage('تم تثبيت الإلغاء، وإيقاف المهام التابعة، وبدء قرار WLT المالي.');
    } catch (error) {
      setState('error');
      setMessage(operatorOrderWorkboardErrorMessage(error));
    }
  };

  return (
    <Box gap={3} padding={4} background="surfaceInset" radiusToken="md">
      <Text role="titleSm">تدخل تشغيلي محكوم</Text>
      <Text role="bodySm" tone="muted">
        يوقف الإلغاء جميع المهام التابعة داخل نفس المعاملة. WLT وحده يقرر تحرير الدفع أو إنشاء الاسترداد.
      </Text>
      <Box gap={2}>
        {OPERATOR_CANCELLATION_REASONS.map((reason) => (
          <Button
            key={reason.code}
            label={reason.label}
            tone={reasonCode === reason.code ? 'brand' : 'secondary'}
            size="sm"
            fullWidth={false}
            disabled={state === 'loading'}
            onPress={() => {
              setReasonCode(reason.code as OperatorCancellationReasonCode);
              if (reason.code !== 'other') setReasonNote('');
            }}
          />
        ))}
      </Box>
      {selectedReason ? <Text role="caption" tone="muted">{selectedReason.description}</Text> : null}
      <textarea
        value={reasonNote}
        onChange={(event) => setReasonNote(event.target.value)}
        placeholder={noteRequired ? 'اكتب التوضيح المطلوب' : 'ملاحظة تشغيلية اختيارية'}
        aria-label="توضيح إلغاء الطلب"
        rows={3}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid var(--bthwani-control-panel-border)',
          borderRadius: '8px',
          background: 'var(--bthwani-control-panel-surface-base)',
          resize: 'vertical',
        }}
      />
      {message ? <Text role="bodySm" tone={state === 'error' ? 'danger' : 'success'}>{message}</Text> : null}
      <Button
        label={state === 'loading' ? 'جارٍ تثبيت الإلغاء…' : 'تأكيد الإلغاء وإغلاق المهام'}
        tone="danger"
        disabled={state === 'loading' || (noteRequired && !reasonNote.trim())}
        onPress={() => void submit()}
      />
    </Box>
  );
}
