'use client';

import React from 'react';
import {
  WebControlPanelKpiStrip,
  WebControlPanelDecisionRow,
  WebControlPanelQueue,
  WebControlPanelInspectorShell,
  WebControlPanelStatusTag,
} from '@bthwani/ui-kit/web';
import { Box, KeyValueList, Text } from '@bthwani/ui-kit';
import styles from '../shared/control-panel-surface.module.css';
import { useOperatorPartnerDeliveriesController } from '../../shared/partner-delivery/use-partner-delivery-controller';
import type { DshPartnerDeliveryTask, DshPartnerDeliveryTaskStatus } from '../../shared/partner-delivery/partner-delivery.types';
import { opsTheme as theme } from '../../shared/operations';

export type PartnerDeliveryWorkbenchScreenProps = { hubHref: string; subGroup?: string };

const STATUS_LABELS: Record<DshPartnerDeliveryTaskStatus, string> = {
  unassigned: 'غير مُسندة',
  assigned: 'مُسندة',
  departed: 'غادر الموصل',
  arrived: 'وصل الموصل',
  proof_pending: 'بانتظار إثبات التسليم',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
  exception: 'استثناء',
};

function statusTone(status: DshPartnerDeliveryTaskStatus): 'neutral' | 'warning' | 'danger' | 'success' | 'info' {
  if (status === 'completed') return 'success';
  if (status === 'exception' || status === 'cancelled') return 'danger';
  if (status === 'unassigned') return 'warning';
  return 'info';
}

/** SLA badge derived purely from timestamps already on the task — no local mutation, monitoring only. */
function slaBreachLabel(task: DshPartnerDeliveryTask): string | null {
  const ACTIVE_MS = 45 * 60 * 1000;
  const now = Date.now();
  if (task.status === 'completed' || task.status === 'cancelled') return null;
  const anchor = task.assignedAt ?? task.createdAt;
  if (!anchor) return null;
  const elapsedMs = now - new Date(anchor).getTime();
  if (elapsedMs > ACTIVE_MS) {
    const minutes = Math.floor(elapsedMs / 60000);
    return `تجاوز SLA بـ ${minutes} دقيقة`;
  }
  return null;
}

export function PartnerDeliveryWorkbenchScreen({ hubHref: _hubHref, subGroup: _subGroup }: PartnerDeliveryWorkbenchScreenProps) {
  const { listState, loadList, detailState, loadDetail, raiseException } = useOperatorPartnerDeliveriesController();
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null);
  const [conflict, setConflict] = React.useState(false);
  const [exceptionReason, setExceptionReason] = React.useState('');
  const [actionState, setActionState] = React.useState<'idle' | 'pending' | 'error'>('idle');
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);
  const retry = React.useCallback(() => loadList(), [loadList]);

  React.useEffect(() => {
    if (selectedTaskId) {
      setConflict(false);
      loadDetail(selectedTaskId);
    }
    setExceptionReason('');
    setActionState('idle');
    setActionMessage(null);
  }, [selectedTaskId, loadDetail]);

  const summaryKpi = [
    { id: 'total', label: 'إجمالي المهام', value: listState.loaded ? String(listState.data.length) : '—', tone: 'neutral' as const },
    { id: 'unassigned', label: 'غير مُسندة', value: listState.loaded ? String(listState.data.filter((t) => t.status === 'unassigned').length) : '—', tone: 'warning' as const },
    { id: 'exception', label: 'استثناءات', value: listState.loaded ? String(listState.data.filter((t) => t.status === 'exception').length) : '—', tone: 'danger' as const },
    { id: 'source', label: 'مصدر البيانات', value: listState.loaded ? 'DSH Runtime' : 'غير متصل', tone: listState.loaded ? ('success' as const) : ('danger' as const) },
  ];

  const task = detailState.data;

  const submitException = React.useCallback(() => {
    if (!task || !exceptionReason.trim()) return;
    setActionState('pending');
    setActionMessage(null);
    raiseException(task.orderId, task.version, exceptionReason.trim()).then((result) => {
      if (result.ok) {
        setActionState('idle');
        setExceptionReason('');
        setActionMessage('تم تسجيل الاستثناء التشغيلي بنجاح.');
        loadList();
        return;
      }
      setActionState('error');
      if (result.kind === 'conflict') {
        setConflict(true);
        setActionMessage('تغيّر إصدار المهمة (VERSION_CONFLICT) — أعد تحميل التفاصيل قبل المتابعة.');
      } else {
        setActionMessage(result.message);
      }
    });
  }, [task, exceptionReason, raiseException, loadList]);

  let inspectorContent: React.ReactNode = null;
  if (selectedTaskId) {
    if (!detailState.loaded && !detailState.error) {
      inspectorContent = (
        <WebControlPanelInspectorShell title="جارٍ التحميل..." onClose={() => setSelectedTaskId(null)}>
          <div style={{ padding: 16 }}><Text role="bodySm" tone="muted">جارٍ تحميل تفاصيل المهمة...</Text></div>
        </WebControlPanelInspectorShell>
      );
    } else if (detailState.error) {
      inspectorContent = (
        <WebControlPanelInspectorShell title="تعذر تحميل التفاصيل" onClose={() => setSelectedTaskId(null)}>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Text role="bodySm" tone="danger">{detailState.error}</Text>
            <button type="button" onClick={() => loadDetail(selectedTaskId)} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: theme.danger, color: theme.textInverse, cursor: 'pointer' }}>إعادة المحاولة</button>
          </div>
        </WebControlPanelInspectorShell>
      );
    } else if (task) {
      const sla = slaBreachLabel(task);
      inspectorContent = (
        <WebControlPanelInspectorShell title={`مهمة توصيل الشريك — ${task.orderId}`} onClose={() => setSelectedTaskId(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16, overflowY: 'auto', flex: 1, direction: 'rtl', textAlign: 'right' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 800 }}>الحالة:</span>
              <WebControlPanelStatusTag label={STATUS_LABELS[task.status]} tone={statusTone(task.status)} />
            </div>

            {sla && (
              <div style={{ background: theme.dangerSurface, border: `1px solid ${theme.danger}`, color: theme.dangerText, borderRadius: 8, padding: 10, fontSize: 12, fontWeight: 700 }}>
                ⚠ {sla}
              </div>
            )}

            <KeyValueList
              items={[
                { label: 'رقم الطلب', value: task.orderId },
                { label: 'المتجر', value: task.storeId },
                { label: 'الفرع', value: task.branchId },
                { label: 'موصل الشريك', value: task.storeCourierId || '—' },
                { label: 'الإصدار (version)', value: String(task.version) },
                { label: 'أُسندت في', value: task.assignedAt ?? '—' },
                { label: 'استُلمت في', value: task.pickedUpAt ?? '—' },
                { label: 'غادرت في', value: task.departedAt ?? '—' },
                { label: 'وصلت في', value: task.arrivedAt ?? '—' },
                { label: 'طريقة الإثبات', value: task.proofMethod ?? '—' },
                { label: 'اكتملت في', value: task.completedAt ?? '—' },
              ]}
            />

            {conflict ? (
              <div style={{ background: theme.dangerSurface, border: `1px solid ${theme.danger}`, borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Text role="bodySm" tone="danger">تعارض إصدار (VERSION_CONFLICT): تم تعديل هذه المهمة من مكان آخر.</Text>
                <button type="button" onClick={() => loadDetail(selectedTaskId)} style={{ padding: '8px', borderRadius: 6, border: 'none', background: theme.danger, color: theme.textInverse, fontWeight: 700, cursor: 'pointer' }}>
                  إعادة تحميل التفاصيل
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Text role="caption" tone="muted">
                  هذه لوحة مراقبة تشغيلية فقط — لا يمكن إسناد كابتن بثواني أو تنفيذ أي إجراء مالي (WLT) من هنا.
                </Text>
                <label htmlFor="pd-exception-reason" style={{ fontSize: 11, color: theme.textMuted }}>سبب الاستثناء التشغيلي:</label>
                <textarea
                  id="pd-exception-reason"
                  rows={3}
                  value={exceptionReason}
                  onChange={(e) => setExceptionReason(e.target.value)}
                  placeholder="اكتب سبب فتح استثناء تشغيلي على هذه المهمة..."
                  style={{ padding: 8, fontSize: 12, borderRadius: 6, border: `1px solid ${theme.line}` }}
                />
                <button
                  type="button"
                  disabled={!exceptionReason.trim() || actionState === 'pending'}
                  onClick={submitException}
                  style={{ padding: 10, borderRadius: 8, border: 'none', background: theme.danger, color: theme.textInverse, fontWeight: 700, cursor: exceptionReason.trim() ? 'pointer' : 'not-allowed', opacity: exceptionReason.trim() ? 1 : 0.6 }}
                >
                  {actionState === 'pending' ? 'جارٍ التسجيل...' : 'تسجيل استثناء تشغيلي (create_operational_exception)'}
                </button>
                {actionMessage && (
                  <Text role="caption" tone={actionState === 'error' ? 'danger' : 'success'}>{actionMessage}</Text>
                )}
              </div>
            )}
          </div>
        </WebControlPanelInspectorShell>
      );
    }
  }

  return (
    <Box gap={3}>
      <WebControlPanelKpiStrip items={summaryKpi} />
      <div className={styles.surfaceSplitGrid}>
        <Box gap={3}>
          <WebControlPanelQueue
            title="مهام توصيل الشريك (Partner Delivery)"
            meta={listState.loaded ? `${listState.data.length} مهمة` : 'runtime غير متاح'}
          >
            {listState.loaded ? (
              listState.data.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center' }}>
                  <Text role="bodySm" tone="muted">لا توجد مهام توصيل شريك حالياً.</Text>
                </div>
              ) : (
                listState.data.map((t) => {
                  const sla = slaBreachLabel(t);
                  return (
                    <WebControlPanelDecisionRow
                      key={t.id}
                      entityId={t.orderId}
                      entityLabel={`متجر: ${t.storeId} — موصل: ${t.storeCourierId || 'غير مُسند'}`}
                      status={sla ? `${STATUS_LABELS[t.status]} — ${sla}` : STATUS_LABELS[t.status]}
                      statusTone={sla ? 'danger' : statusTone(t.status)}
                      sla={`آخر تحديث: ${new Date(t.updatedAt).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`}
                      onInspect={() => setSelectedTaskId(t.id)}
                      primaryAction={{ id: `${t.id}-inspect`, label: 'فتح التفاصيل', onAction: () => setSelectedTaskId(t.id) }}
                    />
                  );
                })
              )
            ) : (
              <div style={{ padding: 16, textAlign: 'center' }}>
                <Text role="bodySm" tone="muted">
                  {listState.error ? `تعذر تحميل مهام توصيل الشريك: ${listState.error}` : 'جارٍ تحميل مهام توصيل الشريك...'}
                </Text>
                {listState.error && (
                  <div style={{ marginTop: 10 }}>
                    <button type="button" onClick={retry} style={{ padding: '6px 18px', background: theme.danger, color: theme.textInverse, border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>إعادة المحاولة</button>
                  </div>
                )}
              </div>
            )}
          </WebControlPanelQueue>
        </Box>
        <Box gap={4}>
          {inspectorContent ?? (
            <div style={{ padding: 16 }}>
              <Text role="bodySm" tone="muted">اختر مهمة من القائمة لمعاينة تفاصيلها وتسجيل استثناء تشغيلي عند الحاجة.</Text>
            </div>
          )}
        </Box>
      </div>
    </Box>
  );
}

export default PartnerDeliveryWorkbenchScreen;
