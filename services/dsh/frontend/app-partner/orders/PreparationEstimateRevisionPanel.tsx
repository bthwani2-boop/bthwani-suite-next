import React from 'react';
import { Box, Button, StateView, Text, TextField } from '@bthwani/ui-kit';
import { classifyOrderError, reviseOrderPreparationEstimate } from '../../shared/orders/orders.api';
import type { GovernedPartnerOrderItem } from '../../shared/partner/partner.adapters';

export function PreparationEstimateRevisionPanel({
  order,
  onClose,
  onUpdated,
}: {
  readonly order: GovernedPartnerOrderItem;
  readonly onClose: () => void;
  readonly onUpdated: () => void | Promise<void>;
}) {
  const derivedMinutes = order.preparation.preparationRemainingSeconds > 0
    ? Math.max(5, Math.ceil(order.preparation.preparationRemainingSeconds / 60))
    : Math.max(5, order.preparation.estimatedPreparationMinutes || 25);
  const [minutes, setMinutes] = React.useState(String(derivedMinutes));
  const [reason, setReason] = React.useState(order.preparation.preparationDelayReason);
  const [state, setState] = React.useState<'ready' | 'submitting' | 'success' | 'error'>('ready');
  const [errorMessage, setErrorMessage] = React.useState('');

  const parsedMinutes = Number.parseInt(minutes.trim(), 10);
  const validMinutes = Number.isInteger(parsedMinutes) && parsedMinutes >= 5 && parsedMinutes <= 180;
  const validReason = reason.trim().length >= 3;

  const submit = React.useCallback(async () => {
    if (!order.allowedActions.includes('revise_estimate') || !validMinutes || !validReason) return;
    setState('submitting');
    setErrorMessage('');
    try {
      await reviseOrderPreparationEstimate(order.id, {
        remainingMinutes: parsedMinutes,
        reason: reason.trim(),
      });
      await onUpdated();
      setState('success');
    } catch (error) {
      const classified = classifyOrderError(error);
      setErrorMessage(
        classified.kind === 'conflict'
          ? 'تغيرت حالة الطلب ولم يعد تعديل الموعد مسموحًا.'
          : classified.kind === 'offline'
            ? 'تعذر الاتصال. لم يتغير الموعد.'
            : classified.message ?? 'تعذر تعديل موعد الجاهزية.',
      );
      setState('error');
    }
  }, [order, validMinutes, validReason, parsedMinutes, reason, onUpdated]);

  if (state === 'success') {
    return (
      <StateView
        tone="success"
        title="تم تحديث موعد الجاهزية"
        description="ظهر الموعد الجديد للعميل والعمليات وسُجل السبب في سجل الطلب."
        actionLabel="إغلاق"
        onActionPress={onClose}
      />
    );
  }

  return (
    <Box gap={3} padding={4} background="surfaceInset">
      <Box gap={1}>
        <Text role="bodyStrong">مراجعة موعد جاهزية {order.orderCode}</Text>
        <Text role="caption" tone="muted">أدخل الدقائق المتبقية الفعلية. سيظهر السبب للعمليات ويُسجل كتغيير قابل للمراجعة.</Text>
      </Box>
      {state === 'error' ? <Text role="bodySm" tone="danger">{errorMessage}</Text> : null}
      <TextField
        label="الدقائق المتبقية"
        value={minutes}
        onChangeText={setMinutes}
        placeholder="من 5 إلى 180 دقيقة"
      />
      <TextField
        label="سبب تعديل الموعد"
        value={reason}
        onChangeText={setReason}
        placeholder="مثال: زيادة حجم الطلب أو انتظار صنف"
      />
      <Box layoutDirection="row" gap={2}>
        <Button
          label={state === 'submitting' ? 'جارٍ الحفظ…' : 'تثبيت الموعد الجديد'}
          disabled={state === 'submitting' || !validMinutes || !validReason || !order.allowedActions.includes('revise_estimate')}
          onPress={() => void submit()}
        />
        <Button label="إلغاء" tone="ghost" onPress={onClose} />
      </Box>
    </Box>
  );
}
