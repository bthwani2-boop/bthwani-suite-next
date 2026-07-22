'use client';

import React from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  StateView,
  Text,
  TextField,
} from '@bthwani/ui-kit';
import {
  useOrderRescueController,
  type DshGovernedOrderRescueCase,
  type DshOrderRescueStatus,
} from '../../shared/support';

export type OrderRescueScreenProps = {
  hubHref: string;
  subGroup?: string;
};

const STATUS_LABELS: Readonly<Record<DshOrderRescueStatus, string>> = {
  open: 'مفتوحة',
  investigating: 'قيد التحقيق',
  action_required: 'تحتاج إجراء',
  resolved: 'محلولة',
  closed: 'مغلقة',
};

function statusTone(status: DshOrderRescueStatus): 'neutral' | 'warning' | 'success' | 'danger' {
  if (status === 'resolved' || status === 'closed') return 'success';
  if (status === 'action_required') return 'danger';
  if (status === 'investigating') return 'warning';
  return 'neutral';
}

export function OrderRescueScreen({ hubHref, subGroup }: OrderRescueScreenProps) {
  const controller = useOrderRescueController('authenticated');
  const [orderId, setOrderId] = React.useState('');
  const [summary, setSummary] = React.useState('');
  const [operatorNote, setOperatorNote] = React.useState('');
  const [selectedId, setSelectedId] = React.useState('');

  const rescueCases = controller.listState.kind === 'success'
    ? controller.listState.rescueCases
    : [];
  const selected = rescueCases.find((item) => item.id === selectedId)
    ?? (controller.actionState.kind === 'success' ? controller.actionState.rescueCase : undefined);

  React.useEffect(() => {
    if (selected?.id) void controller.reloadEvents(selected.id);
  }, [controller.reloadEvents, selected?.id]);

  const createCase = React.useCallback(async () => {
    const cleanOrderId = orderId.trim();
    const cleanSummary = summary.trim();
    if (!cleanOrderId || cleanSummary.length < 5) return;
    const created = await controller.createCase({
      orderId: cleanOrderId,
      reason: 'delivery_failed',
      severity: 'warning',
      summary: cleanSummary,
    });
    if (created) {
      setOrderId('');
      setSummary('');
    }
  }, [controller, orderId, summary]);

  const updateStatus = React.useCallback(async (
    rescueCase: DshGovernedOrderRescueCase,
    status: DshOrderRescueStatus,
  ) => {
    const note = operatorNote.trim();
    const resolving = status === 'resolved' || status === 'closed';
    if (resolving && note.length < 5) return;
    const updated = await controller.updateCase(rescueCase, {
      status,
      reason: rescueCase.reason,
      owner: rescueCase.reason === 'wlt_visibility' ? 'wlt_reference_only' : 'operations',
      nextAction: rescueCase.reason === 'wlt_visibility' ? 'open_wlt_visibility' : 'create_follow_up_task',
      operatorNote: note || 'تم تسجيل قرار إنقاذ تشغيلي.',
      affectedEntity: rescueCase.orderId,
      assignedTo: rescueCase.assignedTo,
      resolutionNote: resolving ? note : '',
    });
    if (updated) setOperatorNote('');
  }, [controller, operatorNote]);

  if (controller.listState.kind === 'loading' || controller.listState.kind === 'idle') {
    return <StateView loading title="جارٍ تحميل حالات إنقاذ الطلب من DSH" />;
  }

  if (controller.listState.kind === 'error') {
    return (
      <StateView
        title="تعذر تحميل إنقاذ الطلب"
        description={controller.listState.message}
        tone="danger"
        actionLabel="إعادة المحاولة"
        onActionPress={() => void controller.reload()}
      />
    );
  }

  return (
    <Box gap={4}>
      <Box gap={1}>
        <Text role="titleLg">إنقاذ الطلبات</Text>
        <Text role="bodySm" tone="muted">
          صف تشغيل حقيقي مرتبط بالطلب، التذكرة الاختيارية، قرارات المشغل وسجل التدقيق.
        </Text>
        {subGroup ? <Text role="caption" tone="muted">المجموعة: {subGroup}</Text> : null}
      </Box>

      <Card padding={4} gap={3}>
        <Text role="titleSm">فتح حالة إنقاذ</Text>
        <TextField
          label="معرف الطلب"
          value={orderId}
          onChangeText={setOrderId}
          placeholder="UUID الطلب الفعلي"
        />
        <TextField
          label="ملخص العائق"
          value={summary}
          onChangeText={setSummary}
          placeholder="اشرح سبب الحاجة إلى تدخل العمليات"
          multiline
        />
        <Button
          label={controller.actionState.kind === 'submitting' ? 'جارٍ الفتح' : 'فتح حالة إنقاذ'}
          disabled={orderId.trim().length === 0 || summary.trim().length < 5 || controller.actionState.kind === 'submitting'}
          onPress={() => void createCase()}
        />
      </Card>

      {controller.listState.kind === 'empty' ? (
        <StateView
          title="لا توجد حالات إنقاذ"
          description="لا تُنشأ حالات مصطنعة؛ افتح حالة مرتبطة بطلب فعلي عند وجود عائق تشغيلي."
          tone="neutral"
        />
      ) : null}

      {rescueCases.map((item) => (
        <Card key={item.id} padding={4} gap={3}>
          <Box layoutDirection="row" justify="space-between" align="center" gap={2}>
            <Box gap={1}>
              <Text role="bodyStrong">الطلب: {item.orderId}</Text>
              <Text role="bodySm">{item.summary}</Text>
            </Box>
            <Badge label={STATUS_LABELS[item.status]} tone={statusTone(item.status)} />
          </Box>
          <Text role="caption" tone="muted">
            السبب: {item.reason} · المالك: {item.owner} · الإجراء: {item.nextAction}
          </Text>
          <Box layoutDirection="row" gap={2}>
            <Button
              label="فتح التفاصيل"
              tone="secondary"
              onPress={() => setSelectedId(item.id)}
            />
            <Button
              label="بدء التحقيق"
              tone="secondary"
              disabled={item.status === 'closed' || controller.actionState.kind === 'submitting'}
              onPress={() => void updateStatus(item, 'investigating')}
            />
            <Button
              label="يتطلب إجراء"
              tone="secondary"
              disabled={item.status === 'closed' || controller.actionState.kind === 'submitting'}
              onPress={() => void updateStatus(item, 'action_required')}
            />
          </Box>
        </Card>
      ))}

      {selected ? (
        <Card padding={4} gap={3}>
          <Text role="titleSm">قرار الحالة {selected.id}</Text>
          <Text role="bodySm">الطلب: {selected.orderId}</Text>
          <TextField
            label="ملاحظة المشغل ودليل القرار"
            value={operatorNote}
            onChangeText={setOperatorNote}
            placeholder="مطلوبة عند الحل أو الإغلاق"
            multiline
          />
          <Box layoutDirection="row" gap={2}>
            <Button
              label="حل الحالة"
              disabled={operatorNote.trim().length < 5 || selected.status === 'closed' || controller.actionState.kind === 'submitting'}
              onPress={() => void updateStatus(selected, 'resolved')}
            />
            <Button
              label="إغلاق الحالة"
              tone="secondary"
              disabled={operatorNote.trim().length < 5 || selected.status !== 'resolved' || controller.actionState.kind === 'submitting'}
              onPress={() => void updateStatus(selected, 'closed')}
            />
            <Button label="إلغاء التحديد" tone="ghost" onPress={() => setSelectedId('')} />
          </Box>
          {controller.eventState.kind === 'loading' ? <Text role="caption">جارٍ تحميل سجل التدقيق…</Text> : null}
          {controller.eventState.kind === 'error' ? <Text role="caption" tone="danger">{controller.eventState.message}</Text> : null}
          {controller.eventState.kind === 'success' ? controller.eventState.events.map((event) => (
            <Text key={event.id} role="caption" tone="muted">
              {event.eventType} · {event.fromStatus || '—'} ← {event.toStatus} · {event.createdAt}
            </Text>
          )) : null}
        </Card>
      ) : null}

      {controller.actionState.kind === 'error' ? (
        <StateView title="تعذر تنفيذ القرار" description={controller.actionState.message} tone="danger" />
      ) : null}

      <Box layoutDirection="row" gap={2}>
        <Button label="تحديث الصف" tone="secondary" onPress={() => void controller.reload()} />
        <Button label="العودة إلى مركز العمليات" tone="ghost" onPress={() => window.location.assign(hubHref)} />
      </Box>
    </Box>
  );
}

export default OrderRescueScreen;
