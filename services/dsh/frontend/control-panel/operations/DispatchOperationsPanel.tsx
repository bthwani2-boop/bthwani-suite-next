'use client';

import React from 'react';
import { Text, TextField } from '@bthwani/ui-kit';
import {
  WebControlPanelDecisionRow,
  WebControlPanelQueue,
} from '@bthwani/ui-kit/web';
import {
  CpBadge,
  CpButton,
  CpDescriptionList,
  CpDescriptionRow,
  CpMutedInline,
  CpPageHeader,
  CpRetryButton,
  CpStatePanel,
  CpStateView,
} from '@bthwani/control-panel/components';
import { OperationsRoomFrame } from '@bthwani/control-panel/shell';
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

const PAGE_TITLE = 'مراقبة التوزيع وسجل القرارات';

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
      <OperationsRoomFrame
        header={<CpPageHeader title={PAGE_TITLE} />}
        stateView={(
          <CpStatePanel
            role="status"
            title="جاري تحميل الإسنادات النشطة"
            description="نقرأ الإسنادات وسجل القرارات من DSH."
          />
        )}
      >
        {null}
      </OperationsRoomFrame>
    );
  }

  if (state.kind === 'error' && state.assignments.length === 0) {
    return (
      <OperationsRoomFrame
        header={<CpPageHeader title={PAGE_TITLE} />}
        stateView={(
          <CpStatePanel role="alert" title="تعذر تحميل إدارة الإسناد" description={state.message}>
            <CpRetryButton onClick={() => void controller.reload()}>إعادة المحاولة</CpRetryButton>
          </CpStatePanel>
        )}
      >
        {null}
      </OperationsRoomFrame>
    );
  }

  const selected = state.selectedAssignment;
  const busy = state.mutationKind !== 'idle';

  return (
    <OperationsRoomFrame
      header={(
        <CpPageHeader title={PAGE_TITLE}>
          <CpMutedInline tight>
            الإلغاء وإعادة الإسناد ينفذان داخل معاملة واحدة مع read-after-write وسجل قرار دائم.
          </CpMutedInline>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <CpButton variant="secondary" disabled={busy} onClick={() => void controller.expire()}>
              {state.mutationKind === 'expiring' ? 'جاري إنهاء المتأخر…' : 'إنهاء العروض المتأخرة'}
            </CpButton>
            <CpButton variant="ghost" disabled={busy} onClick={() => void controller.reload({ preserveSelection: true })}>
              تحديث
            </CpButton>
          </div>
          {state.message ? (
            <div style={{ marginTop: 8 }}>
              <CpStateView kind="error" title={state.message} />
            </div>
          ) : null}
        </CpPageHeader>
      )}
      sidePanel={
        !selected ? (
          <CpStatePanel
            role="status"
            title="اختر إسنادًا"
            description="اختر إسنادًا نشطًا لقراءة القرار أو الإلغاء أو إعادة الإسناد."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 16 }}>
            <CpDescriptionList>
              <CpDescriptionRow label="معرف الإسناد">{selected.id}</CpDescriptionRow>
              <CpDescriptionRow label="الطلب">{selected.orderId || 'طلب خاص'}</CpDescriptionRow>
              <CpDescriptionRow label="الكابتن الحالي">{selected.captainId}</CpDescriptionRow>
              <CpDescriptionRow label="الحالة">
                <CpBadge tone={selected.status === 'offered' ? 'warning' : 'success'}>{selected.status}</CpBadge>
              </CpDescriptionRow>
              <CpDescriptionRow label="منطقة الخدمة">{selected.serviceAreaCode || 'غير محددة'}</CpDescriptionRow>
              <CpDescriptionRow label="المسافة">{formatDistance(selected.distanceMeters)}</CpDescriptionRow>
              <CpDescriptionRow label="الأولوية">{String(selected.priority ?? 0)}</CpDescriptionRow>
              <CpDescriptionRow label="سبب العرض">{selected.offerReason?.trim() || 'غير مسجل'}</CpDescriptionRow>
            </CpDescriptionList>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <TextField
                label="سبب الإلغاء أو إعادة الإسناد"
                value={reason}
                onChangeText={setReason}
                disabled={busy}
                multiline
                placeholder="اكتب سببًا تشغيليًا واضحًا"
              />
              <CpButton
                variant="danger"
                disabled={busy || reason.trim().length < 3}
                onClick={() => void controller.cancel(selected.id, reason)}
              >
                {state.mutationKind === 'cancelling' ? 'جاري الإلغاء…' : 'إلغاء الإسناد'}
              </CpButton>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Text role="label">كابتن بديل مؤهل</Text>
              {state.candidates.length === 0 ? (
                <CpStatePanel
                  role="status"
                  title="لا يوجد بديل مؤهل"
                  description="لا يوجد كابتن آخر معتمد ومتاح ولديه سعة في نفس المنطقة."
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {state.candidates.map((candidate) => (
                    <CpButton
                      key={candidate.captainId}
                      variant={replacementCaptainId === candidate.captainId ? 'brand' : 'secondary'}
                      disabled={busy}
                      onClick={() => setReplacementCaptainId(candidate.captainId)}
                    >
                      {`${candidate.captainId} — السعة ${candidate.remainingCapacity}/${candidate.maxActiveAssignments}`}
                    </CpButton>
                  ))}
                </div>
              )}
              <CpButton
                disabled={busy || !replacementCaptainId || reason.trim().length < 3}
                onClick={() => void controller.reassign(selected, replacementCaptainId, reason)}
              >
                {state.mutationKind === 'reassigning' ? 'جاري إعادة الإسناد…' : 'إعادة الإسناد بأمان'}
              </CpButton>
            </div>

            <WebControlPanelQueue title="سجل القرار" meta={String(state.decisions.length)}>
              {state.decisions.length === 0 ? (
                <CpStatePanel
                  role="status"
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
          </div>
        )
      }
    >
      <WebControlPanelQueue title="الإسنادات النشطة" meta={String(state.assignments.length)}>
        {state.assignments.length === 0 ? (
          <CpStatePanel
            role="status"
            title="لا توجد إسنادات نشطة"
            description="لا توجد عروض معلقة أو مهام مقبولة حاليًا."
          >
            <CpRetryButton onClick={() => void controller.reload()}>تحديث</CpRetryButton>
          </CpStatePanel>
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
    </OperationsRoomFrame>
  );
}

export default DispatchOperationsPanel;
