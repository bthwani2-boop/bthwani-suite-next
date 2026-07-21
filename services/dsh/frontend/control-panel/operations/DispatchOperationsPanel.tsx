'use client';

import React from 'react';
import { Box, Button, KeyValueList, StateView, Text } from '@bthwani/ui-kit';
import {
  WebControlPanelDecisionRow,
  WebControlPanelQueue,
} from '@bthwani/ui-kit/web';
import { useDispatchOperations } from '../../shared/operations';
import type { DshDispatchDecision } from '../../shared/dispatch';

const ACTION_LABELS: Record<DshDispatchDecision['action'], string> = {
  offered: 'إنشاء العرض',
  accepted: 'قبول الكابتن',
  declined: 'رفض الكابتن',
  expired: 'انتهاء المهلة',
  cancelled: 'إلغاء المشغل',
  reassigned: 'إعادة الإسناد',
  eligibility_rejected: 'رفض الأهلية',
  capacity_rejected: 'رفض السعة',
};

function formatDistance(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'غير محسوبة';
  if (value < 1000) return `${value} متر`;
  return `${(value / 1000).toFixed(1)} كم`;
}

function deadlineLabel(value: string): string {
  const deadline = new Date(value);
  if (Number.isNaN(deadline.getTime())) return 'مهلة غير صالحة';
  if (deadline.getTime() <= Date.now()) return 'متأخر';
  return deadline.toLocaleString('ar-YE');
}

export function DispatchOperationsPanel() {
  const controller = useDispatchOperations();
  const { state } = controller;
  const [reason, setReason] = React.useState('');
  const [replacementCaptainId, setReplacementCaptainId] = React.useState('');

  React.useEffect(() => {
    setReason('');
    setReplacementCaptainId('');
  }, [state.selectedAssignment?.id]);

  if (state.kind === 'loading' && state.assignments.length === 0) {
    return (
      <StateView
        stateId="loading"
        title="جاري تحميل الإسنادات النشطة"
        description="نقرأ الإسنادات وسجل القرارات من DSH."
      />
    );
  }

  if (state.kind === 'error' && state.assignments.length === 0) {
    return (
      <StateView
        stateId="recoverableError"
        title="تعذر تحميل إدارة الإسناد"
        description={state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={() => void controller.reload()}
      />
    );
  }

  const selected = state.selectedAssignment;
  const busy = state.mutationKind !== 'idle';

  return (
    <Box gap={3}>
      <Box layoutDirection="row" gap={2} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Box gap={1}>
          <Text role="titleSm">مراقبة التوزيع وسجل القرارات</Text>
          <Text role="bodySm" tone="muted">
            الإلغاء وإعادة الإسناد ينفذان داخل معاملة واحدة مع read-after-write وسجل قرار دائم.
          </Text>
        </Box>
        <Box layoutDirection="row" gap={2}>
          <Button
            label={state.mutationKind === 'expiring' ? 'جاري إنهاء المتأخر…' : 'إنهاء العروض المتأخرة'}
            tone="secondary"
            fullWidth={false}
            disabled={busy}
            onPress={() => void controller.expire()}
          />
          <Button
            label="تحديث"
            tone="ghost"
            fullWidth={false}
            disabled={busy}
            onPress={() => void controller.reload({ preserveSelection: true })}
          />
        </Box>
      </Box>

      {state.message ? <Text role="bodySm" tone="warning">{state.message}</Text> : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>
        <WebControlPanelQueue title="الإسنادات النشطة" meta={String(state.assignments.length)}>
          {state.assignments.length === 0 ? (
            <StateView
              stateId="empty"
              title="لا توجد إسنادات نشطة"
              description="لا توجد عروض معلقة أو مهام مقبولة حاليًا."
              actionLabel="تحديث"
              onActionPress={() => void controller.reload()}
            />
          ) : state.assignments.map((assignment) => (
            <WebControlPanelDecisionRow
              key={assignment.id}
              entityId={assignment.id}
              entityLabel={`طلب: ${assignment.orderId || 'خاص'} · كابتن: ${assignment.captainId}`}
              status={assignment.status}
              statusTone={assignment.status === 'offered' ? 'warning' : 'success'}
              reason={`منطقة ${assignment.serviceAreaCode || '—'} · ${formatDistance(assignment.distanceMeters)}`}
              sla={assignment.status === 'offered' ? `المهلة: ${deadlineLabel(assignment.responseDeadlineAt)}` : 'مهمة مقبولة'}
              onInspect={() => void controller.selectAssignment(assignment)}
            />
          ))}
        </WebControlPanelQueue>

        <Box gap={3}>
          {!selected ? (
            <StateView
              stateId="empty"
              title="اختر إسنادًا"
              description="اختر إسنادًا نشطًا لقراءة القرار أو الإلغاء أو إعادة الإسناد."
            />
          ) : (
            <>
              <KeyValueList
                items={[
                  { label: 'معرف الإسناد', value: selected.id },
                  { label: 'الطلب', value: selected.orderId || 'طلب خاص' },
                  { label: 'الكابتن الحالي', value: selected.captainId },
                  { label: 'الحالة', value: selected.status, tone: selected.status === 'offered' ? 'warning' : 'success' },
                  { label: 'منطقة الخدمة', value: selected.serviceAreaCode || 'غير محددة' },
                  { label: 'المسافة', value: formatDistance(selected.distanceMeters) },
                  { label: 'الأولوية', value: String(selected.priority ?? 0) },
                  { label: 'سبب العرض', value: selected.offerReason?.trim() || 'غير مسجل' },
                ]}
              />

              <Box gap={2}>
                <Text role="label">سبب الإلغاء أو إعادة الإسناد</Text>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  disabled={busy}
                  rows={4}
                  dir="rtl"
                  placeholder="اكتب سببًا تشغيليًا واضحًا"
                  style={{ width: '100%', resize: 'vertical', padding: 12, borderRadius: 8, border: '1px solid currentColor' }}
                />
                <Button
                  label={state.mutationKind === 'cancelling' ? 'جاري الإلغاء…' : 'إلغاء الإسناد'}
                  tone="danger"
                  disabled={busy || reason.trim().length < 3}
                  onPress={() => void controller.cancel(selected.id, reason)}
                />
              </Box>

              <Box gap={2}>
                <Text role="label">كابتن بديل مؤهل</Text>
                {state.candidates.length === 0 ? (
                  <StateView
                    stateId="empty"
                    title="لا يوجد بديل مؤهل"
                    description="لا يوجد كابتن آخر معتمد ومتاح ولديه سعة في نفس المنطقة."
                  />
                ) : state.candidates.map((candidate) => (
                  <Button
                    key={candidate.captainId}
                    label={`${candidate.captainId} — السعة ${candidate.remainingCapacity}/${candidate.maxActiveAssignments}`}
                    tone={replacementCaptainId === candidate.captainId ? 'brand' : 'secondary'}
                    disabled={busy}
                    onPress={() => setReplacementCaptainId(candidate.captainId)}
                  />
                ))}
                <Button
                  label={state.mutationKind === 'reassigning' ? 'جاري إعادة الإسناد…' : 'إعادة الإسناد بأمان'}
                  disabled={busy || !replacementCaptainId || reason.trim().length < 3}
                  onPress={() => void controller.reassign(selected, replacementCaptainId, reason)}
                />
              </Box>

              <WebControlPanelQueue title="سجل القرار" meta={String(state.decisions.length)}>
                {state.decisions.length === 0 ? (
                  <StateView
                    stateId="empty"
                    title="لا توجد قرارات مقروءة"
                    description="قد يكون الإسناد قديمًا أو تعذر تحميل سجله."
                  />
                ) : state.decisions.map((decision) => (
                  <WebControlPanelDecisionRow
                    key={decision.id}
                    entityId={decision.id}
                    entityLabel={ACTION_LABELS[decision.action]}
                    status={decision.reasonCode || decision.action}
                    statusTone={decision.action.includes('rejected') || decision.action === 'cancelled' ? 'danger' : 'info'}
                    reason={decision.reason || `نفذه ${decision.actorRole}: ${decision.actorId}`}
                    sla={new Date(decision.createdAt).toLocaleString('ar-YE')}
                  />
                ))}
              </WebControlPanelQueue>
            </>
          )}
        </Box>
      </div>
    </Box>
  );
}

export default DispatchOperationsPanel;
