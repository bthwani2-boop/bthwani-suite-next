'use client';

import React from 'react';
import { Badge, Box, Button, StateView, Surface, Text, TextField } from '@bthwani/ui-kit';
import {
  WebControlPanelDecisionRow,
  WebControlPanelQueue,
  WebControlPanelRecommendation,
  type WebControlPanelDecisionRowProps,
} from '@bthwani/ui-kit/web';
import { useOperatorPartnerDeliveriesController } from '../../shared/partner-delivery/use-partner-delivery-controller';
import type { OperationsFocusParams } from './operations.types';

export type PartnerDeliveryWorkbenchScreenProps = {
  hubHref: string;
  subGroup?: string;
  focusParams?: OperationsFocusParams;
};

function taskTone(status: string): 'success' | 'danger' | 'warning' {
  if (status === 'completed') return 'success';
  if (status === 'exception' || status === 'cancelled') return 'danger';
  return 'warning';
}

function displayDate(value?: string | null): string {
  return value ? new Date(value).toLocaleString('ar-SA') : '—';
}

export function PartnerDeliveryWorkbenchScreen(_props: PartnerDeliveryWorkbenchScreenProps) {
  const { listState, loadList, detailState, loadDetail, raiseException } =
    useOperatorPartnerDeliveriesController({ limit: 100, autoLoad: true });
  const [reason, setReason] = React.useState('');
  const [evidenceReference, setEvidenceReference] = React.useState('');
  const [actionPending, setActionPending] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const selectedTask = detailState.data;
  const handleRaiseException = React.useCallback(async () => {
    if (!selectedTask || !reason.trim()) return;
    setActionPending(true);
    setFeedback(null);
    const result = await raiseException(
      selectedTask.orderId,
      selectedTask.version,
      reason.trim(),
      evidenceReference.trim() ? [evidenceReference.trim()] : [],
    );
    setActionPending(false);
    if (!result.ok) {
      setFeedback(`تعذر تسجيل الاستثناء: ${result.message}`);
      return;
    }
    setReason('');
    setEvidenceReference('');
    setFeedback('تم تثبيت الاستثناء وسببه ومراجع أدلته في DSH ثم إعادة قراءة المهمة.');
    await loadList();
  }, [evidenceReference, loadList, raiseException, reason, selectedTask]);

  if (!listState.loaded && !listState.error) {
    return (
      <StateView
        stateId="loading"
        title="جاري تحميل مهام توصيل الشريك"
        description="تتم قراءة المهام مباشرة من DSH Runtime."
      />
    );
  }

  if (listState.error) {
    return (
      <StateView
        stateId={listState.offline ? 'offline' : 'recoverableError'}
        title={listState.offline ? 'خدمة توصيل الشريك غير متصلة' : 'تعذر تحميل مهام توصيل الشريك'}
        description={listState.error}
        actionLabel="إعادة المحاولة"
        onActionPress={() => void loadList()}
      />
    );
  }

  return (
    <Box gap={4}>
      <Box gap={1}>
        <Text role="titleMd">توصيل الشريك</Text>
        <Text role="bodySm" tone="muted">
          مراقبة تشغيلية لمهام موصلي المتاجر. الإسناد والحركة والإثبات تبقى داخل تطبيق الشريك، بينما يسجل المشغّل الاستثناءات الموثقة فقط.
        </Text>
      </Box>

      <WebControlPanelRecommendation
        title="فصل أسطول الشريك عن أسطول بثواني"
        reason="مهام partner_delivery لا تدخل صندوق كباتن بثواني، ولا يجوز للمشغّل إنشاء إسناد كابتن لها."
        confidence="high"
        auditTag="JRN_016_PARTNER_FLEET_BOUNDARY"
      />

      {feedback ? (
        <Surface tone="raised" gap={2}>
          <Text role="bodySm">{feedback}</Text>
        </Surface>
      ) : null}

      <WebControlPanelQueue title="مهام توصيل الشريك المباشرة" meta={`${listState.data.length} مهمة`}>
        {listState.data.length === 0 ? (
          <StateView
            stateId="empty"
            title="لا توجد مهام توصيل شريك"
            description="لا توجد مهام مسجلة في DSH حاليًا."
            actionLabel="تحديث"
            onActionPress={() => void loadList()}
          />
        ) : (
          listState.data.map((task) => {
            const rowProps: WebControlPanelDecisionRowProps = {
              entityId: task.id,
              entityLabel: `طلب: ${task.orderId} — متجر: ${task.storeId}`,
              status: task.status,
              statusTone: taskTone(task.status),
              reason: task.exceptionReason
                ? `سبب الاستثناء: ${task.exceptionReason}`
                : `موصل المتجر: ${task.storeCourierId}`,
              sla: `آخر تحديث: ${displayDate(task.updatedAt)}`,
              primaryAction: {
                id: `detail-${task.id}`,
                label: detailState.data?.id === task.id ? 'التفاصيل معروضة' : 'عرض التفاصيل',
                onAction: () => void loadDetail(task.id),
              },
            };
            return <WebControlPanelDecisionRow key={task.id} {...rowProps} />;
          })
        )}
      </WebControlPanelQueue>

      {!detailState.loaded && !detailState.error ? null : detailState.error ? (
        <StateView
          stateId={detailState.offline ? 'offline' : 'recoverableError'}
          title="تعذر تحميل تفاصيل المهمة"
          description={detailState.error}
        />
      ) : selectedTask ? (
        <Surface tone="raised" gap={3}>
          <Box gap={1}>
            <Text role="titleSm">تفاصيل المهمة {selectedTask.id}</Text>
            <Badge label={`الحالة: ${selectedTask.status}`} tone={taskTone(selectedTask.status)} />
            <Text role="bodySm" tone="muted">الطلب: {selectedTask.orderId}</Text>
            <Text role="bodySm" tone="muted">الموصل: {selectedTask.storeCourierId}</Text>
            <Text role="bodySm" tone="muted">الاستلام: {displayDate(selectedTask.pickedUpAt)}</Text>
            <Text role="bodySm" tone="muted">المغادرة: {displayDate(selectedTask.departedAt)}</Text>
            <Text role="bodySm" tone="muted">الوصول: {displayDate(selectedTask.arrivedAt)}</Text>
            <Text role="bodySm" tone="muted">الإثبات: {selectedTask.proofReference || '—'}</Text>
            <Text role="bodySm" tone="muted">سبب الاستثناء: {selectedTask.exceptionReason || '—'}</Text>
            <Text role="bodySm" tone="muted">
              مراجع الأدلة: {selectedTask.exceptionEvidenceReferences?.join('، ') || '—'}
            </Text>
          </Box>

          {selectedTask.status !== 'completed' && selectedTask.status !== 'cancelled' && selectedTask.status !== 'exception' ? (
            <Box gap={2}>
              <TextField
                label="سبب الاستثناء"
                placeholder="اكتب سببًا تشغيليًا واضحًا"
                value={reason}
                onChangeText={setReason}
              />
              <TextField
                label="مرجع الدليل"
                placeholder="مثال: support-case:123 أو media:ref"
                value={evidenceReference}
                onChangeText={setEvidenceReference}
              />
              <Button
                label={actionPending ? 'جارٍ تثبيت الاستثناء…' : 'تسجيل الاستثناء الموثق'}
                tone="danger"
                disabled={actionPending || !reason.trim()}
                onPress={() => void handleRaiseException()}
              />
            </Box>
          ) : null}
        </Surface>
      ) : null}
    </Box>
  );
}

export default PartnerDeliveryWorkbenchScreen;
