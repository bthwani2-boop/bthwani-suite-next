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
import { useOperatorPickupsController } from '../../shared/pickup/use-pickup-controller';
import type { DshPickupSession } from '../../shared/pickup/pickup.types';
import { opsTheme as theme } from '../../shared/operations';

export type PickupWorkbenchScreenProps = { hubHref: string; subGroup?: string };

function resolvePickupStatus(session: DshPickupSession): { label: string; tone: 'neutral' | 'warning' | 'danger' | 'success' | 'info' } {
  if (session.usedAt) return { label: 'تم الاستلام', tone: 'success' };
  if (new Date(session.expiresAt).getTime() < Date.now()) return { label: 'منتهية الصلاحية', tone: 'danger' };
  if (session.attemptCount >= session.maxAttempts) return { label: 'استنفدت المحاولات', tone: 'danger' };
  return { label: 'بانتظار الاستلام', tone: 'warning' };
}

export function PickupWorkbenchScreen({ hubHref: _hubHref, subGroup: _subGroup }: PickupWorkbenchScreenProps) {
  const { listState, loadList, detailState, loadDetail, extendWindow, resendNotification } = useOperatorPickupsController();
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);
  const [conflict, setConflict] = React.useState(false);
  const [extendReason, setExtendReason] = React.useState('');
  const [extendMinutes, setExtendMinutes] = React.useState('30');
  const [actionState, setActionState] = React.useState<'idle' | 'pending' | 'error'>('idle');
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);
  const retry = React.useCallback(() => loadList(), [loadList]);

  React.useEffect(() => {
    if (selectedOrderId) {
      setConflict(false);
      loadDetail(selectedOrderId);
    }
    setExtendReason('');
    setExtendMinutes('30');
    setActionState('idle');
    setActionMessage(null);
  }, [selectedOrderId, loadDetail]);

  const summaryKpi = [
    { id: 'total', label: 'إجمالي الجلسات', value: listState.loaded ? String(listState.data.length) : '—', tone: 'neutral' as const },
    { id: 'pending', label: 'بانتظار الاستلام', value: listState.loaded ? String(listState.data.filter((s) => !s.usedAt && new Date(s.expiresAt).getTime() >= Date.now()).length) : '—', tone: 'warning' as const },
    { id: 'expired', label: 'منتهية/مستنفدة', value: listState.loaded ? String(listState.data.filter((s) => !s.usedAt && (new Date(s.expiresAt).getTime() < Date.now() || s.attemptCount >= s.maxAttempts)).length) : '—', tone: 'danger' as const },
    { id: 'source', label: 'مصدر البيانات', value: listState.loaded ? 'DSH Runtime' : 'غير متصل', tone: listState.loaded ? ('success' as const) : ('danger' as const) },
  ];

  const session = detailState.data;

  const submitExtend = React.useCallback(() => {
    if (!session || !extendReason.trim()) return;
    const minutes = Number(extendMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    const newExpiry = new Date(Date.now() + minutes * 60000).toISOString();
    setActionState('pending');
    setActionMessage(null);
    extendWindow(session.orderId, session.version, extendReason.trim(), newExpiry).then((result) => {
      if (result.ok) {
        setActionState('idle');
        setExtendReason('');
        setActionMessage('تم تمديد نافذة الاستلام بنجاح.');
        loadList();
        return;
      }
      setActionState('error');
      if (result.kind === 'conflict') {
        setConflict(true);
        setActionMessage('تغيّر إصدار الجلسة (VERSION_CONFLICT) — أعد تحميل التفاصيل قبل المتابعة.');
      } else if (result.code === 'PICKUP_CODE_ALREADY_USED') {
        setActionMessage('تعذر التمديد: تم استخدام رمز الاستلام بالفعل (PICKUP_CODE_ALREADY_USED).');
      } else {
        setActionMessage(result.message);
      }
    });
  }, [session, extendReason, extendMinutes, extendWindow, loadList]);

  const submitResendNotification = React.useCallback(() => {
    if (!session) return;
    setActionState('pending');
    setActionMessage(null);
    resendNotification(session.orderId, session.version).then((result) => {
      if (result.ok) {
        setActionState('idle');
        setActionMessage('تم إعادة إرسال إشعار الاستلام للعميل.');
        loadList();
        return;
      }
      setActionState('error');
      if (result.kind === 'conflict') {
        setConflict(true);
        setActionMessage('تغيّر إصدار الجلسة (VERSION_CONFLICT) — أعد تحميل التفاصيل قبل المتابعة.');
      } else {
        setActionMessage(result.message);
      }
    });
  }, [session, resendNotification, loadList]);

  let inspectorContent: React.ReactNode = null;
  if (selectedOrderId) {
    if (!detailState.loaded && !detailState.error) {
      inspectorContent = (
        <WebControlPanelInspectorShell title="جارٍ التحميل..." onClose={() => setSelectedOrderId(null)}>
          <div style={{ padding: 16 }}><Text role="bodySm" tone="muted">جارٍ تحميل تفاصيل الجلسة...</Text></div>
        </WebControlPanelInspectorShell>
      );
    } else if (detailState.error) {
      inspectorContent = (
        <WebControlPanelInspectorShell title="تعذر تحميل التفاصيل" onClose={() => setSelectedOrderId(null)}>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Text role="bodySm" tone="danger">{detailState.error}</Text>
            <button type="button" onClick={() => loadDetail(selectedOrderId)} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: theme.danger, color: theme.textInverse, cursor: 'pointer' }}>إعادة المحاولة</button>
          </div>
        </WebControlPanelInspectorShell>
      );
    } else if (session) {
      const status = resolvePickupStatus(session);
      inspectorContent = (
        <WebControlPanelInspectorShell title={`جلسة استلام ذاتي — ${session.orderId}`} onClose={() => setSelectedOrderId(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16, overflowY: 'auto', flex: 1, direction: 'rtl', textAlign: 'right' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 800 }}>الحالة:</span>
              <WebControlPanelStatusTag label={status.label} tone={status.tone} />
            </div>

            <KeyValueList
              items={[
                { label: 'رقم الطلب', value: session.orderId },
                { label: 'المتجر', value: session.storeId },
                { label: 'العميل', value: session.clientId },
                { label: 'الإصدار (version)', value: String(session.version) },
                { label: 'تنتهي الصلاحية في', value: session.expiresAt },
                { label: 'عدد المحاولات', value: `${session.attemptCount} / ${session.maxAttempts}` },
                { label: 'استُخدمت في', value: session.usedAt ?? '—' },
                { label: 'طريقة التحقق', value: session.verificationMethod ?? '—' },
              ]}
            />

            {conflict ? (
              <div style={{ background: theme.dangerSurface, border: `1px solid ${theme.danger}`, borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Text role="bodySm" tone="danger">تعارض إصدار (VERSION_CONFLICT): تم تعديل هذه الجلسة من مكان آخر.</Text>
                <button type="button" onClick={() => loadDetail(selectedOrderId)} style={{ padding: 8, borderRadius: 6, border: 'none', background: theme.danger, color: theme.textInverse, fontWeight: 700, cursor: 'pointer' }}>
                  إعادة تحميل التفاصيل
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    type="button"
                    disabled={Boolean(session.usedAt) || actionState === 'pending'}
                    onClick={submitResendNotification}
                    style={{ padding: 10, borderRadius: 8, border: 'none', background: theme.brand ?? '#2563eb', color: theme.textInverse, fontWeight: 700, cursor: session.usedAt ? 'not-allowed' : 'pointer', opacity: session.usedAt ? 0.6 : 1 }}
                  >
                    {actionState === 'pending' ? 'جارٍ الإرسال...' : 'إعادة إرسال إشعار الاستلام (resend_pickup_notification)'}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label htmlFor="pk-extend-minutes" style={{ fontSize: 11, color: theme.textMuted }}>تمديد النافذة بعدد الدقائق:</label>
                  <input
                    id="pk-extend-minutes"
                    type="number"
                    min={1}
                    value={extendMinutes}
                    onChange={(e) => setExtendMinutes(e.target.value)}
                    style={{ padding: 8, fontSize: 12, borderRadius: 6, border: `1px solid ${theme.line}` }}
                  />
                  <label htmlFor="pk-extend-reason" style={{ fontSize: 11, color: theme.textMuted }}>سبب التمديد (مطلوب):</label>
                  <textarea
                    id="pk-extend-reason"
                    rows={2}
                    value={extendReason}
                    onChange={(e) => setExtendReason(e.target.value)}
                    placeholder="اكتب سبب تمديد نافذة الاستلام..."
                    style={{ padding: 8, fontSize: 12, borderRadius: 6, border: `1px solid ${theme.line}` }}
                  />
                  <button
                    type="button"
                    disabled={!extendReason.trim() || Boolean(session.usedAt) || actionState === 'pending'}
                    onClick={submitExtend}
                    style={{ padding: 10, borderRadius: 8, border: 'none', background: theme.danger, color: theme.textInverse, fontWeight: 700, cursor: extendReason.trim() && !session.usedAt ? 'pointer' : 'not-allowed', opacity: extendReason.trim() && !session.usedAt ? 1 : 0.6 }}
                  >
                    {actionState === 'pending' ? 'جارٍ التمديد...' : 'تمديد نافذة الاستلام (extend_pickup_window)'}
                  </button>
                </div>

                {actionMessage && (
                  <Text role="caption" tone={actionState === 'error' ? 'danger' : 'success'}>{actionMessage}</Text>
                )}
              </>
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
            title="جلسات الاستلام الذاتي (Pickup)"
            meta={listState.loaded ? `${listState.data.length} جلسة` : 'runtime غير متاح'}
          >
            {listState.loaded ? (
              listState.data.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center' }}>
                  <Text role="bodySm" tone="muted">لا توجد جلسات استلام ذاتي حالياً.</Text>
                </div>
              ) : (
                listState.data.map((s) => {
                  const status = resolvePickupStatus(s);
                  return (
                    <WebControlPanelDecisionRow
                      key={s.id}
                      entityId={s.orderId}
                      entityLabel={`متجر: ${s.storeId} — عميل: ${s.clientId}`}
                      status={status.label}
                      statusTone={status.tone}
                      sla={`تنتهي: ${new Date(s.expiresAt).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`}
                      onInspect={() => setSelectedOrderId(s.orderId)}
                      primaryAction={{ id: `${s.id}-inspect`, label: 'فتح التفاصيل', onAction: () => setSelectedOrderId(s.orderId) }}
                    />
                  );
                })
              )
            ) : (
              <div style={{ padding: 16, textAlign: 'center' }}>
                <Text role="bodySm" tone="muted">
                  {listState.error ? `تعذر تحميل جلسات الاستلام: ${listState.error}` : 'جارٍ تحميل جلسات الاستلام...'}
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
              <Text role="bodySm" tone="muted">اختر جلسة استلام من القائمة لمعاينة تفاصيلها وتنفيذ إجراءات المراقبة.</Text>
            </div>
          )}
        </Box>
      </div>
    </Box>
  );
}

export default PickupWorkbenchScreen;
