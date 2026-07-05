'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  WebControlPanelKpiStrip,
  WebControlPanelRecommendation,
  WebControlPanelQueue,
  WebControlPanelStatusTag,
} from '@bthwani/ui-kit/web';
import { Box } from '@bthwani/ui-kit';
import { AuditTrailDetailWorkspace } from './AuditTrailDetailWorkspace';
import { getDynamicUiAudits } from '../../shared/partner/partner.workflow';
import { resolveAuditEntry } from '../../shared/identity-access/dsh-role-permission.model';
import { getDshControlPanelGovernanceEntry } from '../../shared/runtime';
import { fetchDshRuntimeOrders, type DshRuntimeOrderRow } from '../../shared/operations/dsh-operational-runtime-adapter';
import styles from '../shared/control-panel-surface.module.css';
import { DSH_CONTROL_PANEL_TONE_MAP } from '../../shared/runtime';

export type AuditSupportSlaScreenProps = { hubHref: string; subGroup?: string; };

export function AuditSupportSlaScreen({ hubHref: _hubHref, subGroup: _subGroup }: AuditSupportSlaScreenProps) {
  const router = useRouter();
  const [detailOrderId, setDetailOrderId] = React.useState<string | null>(null);
  const supportGovernance = getDshControlPanelGovernanceEntry('support');
  const platformGovernance = getDshControlPanelGovernanceEntry('platform');

  const dynamicAudits = getDynamicUiAudits();
  const allAudits = [...dynamicAudits];

  const [retryCount, setRetryCount] = React.useState(0);
  const [runtimeAuditState, setRuntimeAuditState] = React.useState<{
    orders: readonly DshRuntimeOrderRow[];
    isLoading: boolean;
    error: string | null;
    offline: boolean;
  }>({ orders: [], isLoading: true, error: null, offline: false });

  const retry = React.useCallback(() => setRetryCount((n) => n + 1), []);

  React.useEffect(() => {
    let cancelled = false;
    setRuntimeAuditState((s) => ({ ...s, isLoading: true, error: null, offline: false }));
    fetchDshRuntimeOrders({ limit: 50 }).then((result) => {
      if (cancelled) return;
      if (result.kind === 'ok') {
        const auditNeeded = result.orders.filter((o) =>
          o.status === 'cancelled' ||
          o.status === 'delivered'
        );
        setRuntimeAuditState({ orders: auditNeeded, isLoading: false, error: null, offline: false });
      } else if (result.kind === 'offline') {
        setRuntimeAuditState({ orders: [], isLoading: false, error: null, offline: true });
      } else {
        setRuntimeAuditState({ orders: [], isLoading: false, error: result.message, offline: false });
      }
    });
    return () => { cancelled = true; };
  }, [retryCount]);

  const isEmpty = !runtimeAuditState.isLoading && !runtimeAuditState.error && !runtimeAuditState.offline && runtimeAuditState.orders.length === 0;
  const loaded = !runtimeAuditState.isLoading && !runtimeAuditState.error && !runtimeAuditState.offline;

  const summaryKpi = [
    { id: 'runtime-audit', label: 'تدقيقات Runtime', value: loaded ? String(runtimeAuditState.orders.length) : '—', tone: 'warning' as const },
    { id: 'audits', label: 'التدقيقات اليدوية', value: String(dynamicAudits.length), tone: 'neutral' as const },
    { id: 'sla', label: 'خطر SLA', value: '0', tone: 'danger' as const },
    { id: 'source', label: 'مصدر البيانات', value: loaded ? 'DSH Runtime' : runtimeAuditState.offline ? 'Offline' : runtimeAuditState.error ? 'Error' : 'Loading…', tone: loaded ? 'success' as const : 'warning' as const },
  ];

  return (
    <Box gap={3}>
      {/* ── KPIs ── */}
      <WebControlPanelKpiStrip items={summaryKpi} />

      {/* ── Governance Header Cards ── */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <div className={styles.surfaceInfoCard} style={{ flex: '1 1 300px', padding: '6px 12px' }}>
          <div>
            <div className={styles.surfaceInfoCardTitle}>مالك التذاكر والمتابعة</div>
            <div className={styles.surfaceInfoCardDescription}>{supportGovernance.notes}</div>
          </div>
        </div>
        <div className={styles.surfaceInfoCard} style={{ flex: '1 1 300px', padding: '6px 12px' }}>
          <div>
            <div className={styles.surfaceInfoCardTitle}>مرجع السياسات والالتزام</div>
            <div className={styles.surfaceInfoCardDescription}>{platformGovernance.notes}</div>
          </div>
        </div>
      </div>

      {(runtimeAuditState.error || runtimeAuditState.offline) && (
        <div style={{ padding: '8px 12px', background: 'var(--bthwani-control-panel-surface)', border: '1px solid var(--bthwani-control-panel-border)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: 'var(--bthwani-control-panel-text-muted)' }}>
            {runtimeAuditState.offline ? 'لا يوجد اتصال بالشبكة — network offline' : `خطأ: ${runtimeAuditState.error}`}
          </span>
          <button type="button" onClick={retry} style={{ fontSize: '12px', color: 'var(--bthwani-control-panel-brand)', background: 'none', border: 'none', cursor: 'pointer' }}>إعادة المحاولة</button>
        </div>
      )}
      {isEmpty && (
        <div style={{ padding: '8px 12px', color: 'var(--bthwani-control-panel-text-muted)', fontSize: '12px' }}>لا توجد طلبات تحتاج تدقيقاً — empty queue</div>
      )}

      {/* ── Split Layout ── */}
      <div className={styles.surfaceSplitGrid}>
        <Box gap={3}>
          {/* Runtime Audit Queue — real orders needing audit from DSH backend */}
          {loaded && runtimeAuditState.orders.length > 0 && (
            <WebControlPanelQueue
              title="تدقيق Runtime — طلبات تحتاج مراجعة"
              meta={`${runtimeAuditState.orders.length} طلب من DSH`}
            >
              {runtimeAuditState.orders.map((order) => (
                <div
                  key={order.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1.5fr 1fr 1.2fr auto',
                    gap: '8px',
                    padding: '10px 12px',
                    background: detailOrderId === order.id ? 'var(--bthwani-brand-surface)' : 'var(--bthwani-control-panel-surface)',
                    border: detailOrderId === order.id ? '1px solid var(--bthwani-brand)' : '1px solid var(--bthwani-control-panel-border)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    alignItems: 'center',
                  }}
                  onClick={() => setDetailOrderId(detailOrderId === order.id ? null : order.id)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <strong style={{ color: 'var(--bthwani-control-panel-brand)', fontSize: '11px' }} dir="ltr">{order.id}</strong>
                    <span style={{ fontSize: '10px', color: 'var(--bthwani-control-panel-text-muted)' }}>متجر: {order.storeId}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text)' }}>{order.status}</div>
                  <div style={{ fontSize: '10px', color: 'var(--bthwani-control-panel-text-muted)' }}>
                    {order.captainId ? `كابتن: ${order.captainId}` : '—'}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--bthwani-control-panel-text-muted)' }}>
                    {new Date(order.updatedAt).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <button
                    type="button"
                    style={{ background: 'transparent', border: 'none', color: 'var(--bthwani-control-panel-brand)', cursor: 'pointer', fontSize: '14px', width: '40px', textAlign: 'center' }}
                    onClick={(e) => { e.stopPropagation(); setDetailOrderId(detailOrderId === order.id ? null : order.id); }}
                    aria-label="فتح التفاصيل"
                  >
                    {detailOrderId === order.id ? '◀' : '►'}
                  </button>
                </div>
              ))}
            </WebControlPanelQueue>
          )}

          <WebControlPanelQueue
            title={loaded ? 'سجل التدقيق والمتابعة (Preview)' : 'سجل التدقيق والمتابعة'}
            meta={`${allAudits.length} تدقيقات نشطة`}
          >
            {/* Table Column Headers */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1.5fr 1fr 1.2fr auto',
                gap: '8px',
                padding: '8px 12px',
                background: 'var(--bthwani-control-panel-surface-inset)',
                borderRadius: '6px',
                fontWeight: 800,
                fontSize: '11px',
                color: 'var(--bthwani-control-panel-text-muted)',
                borderBottom: '1px solid var(--bthwani-control-panel-border)',
              }}
            >
              <span>المُنفّذ والسبب</span>
              <span>الملاحظة والتدقيق</span>
              <span>المستند والربط</span>
              <span>الحالة والتوقيت</span>
              <span style={{ width: '40px', textAlign: 'center' }}>العمل</span>
            </div>

            {/* Table Rows */}
            {allAudits.map((item) => {
              const statusTone = DSH_CONTROL_PANEL_TONE_MAP[item.statusTone] ?? 'neutral';
              const isSelected = detailOrderId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => setDetailOrderId(isSelected ? null : item.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1.5fr 1fr 1.2fr auto',
                    gap: '8px',
                    padding: '10px 12px',
                    background: isSelected ? 'var(--bthwani-brand-surface)' : 'var(--bthwani-control-panel-surface)',
                    border: isSelected ? '1px solid var(--bthwani-brand)' : '1px solid var(--bthwani-control-panel-border)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    alignItems: 'center',
                  }}
                >
                  {/* Column 1: Who and Why (Clear Arabic Label) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <strong style={{ color: 'var(--bthwani-control-panel-brand)' }}>{item.who}</strong>
                    <span style={{ color: 'var(--bthwani-control-panel-text)', fontSize: '11px' }}>{item.why}</span>
                  </div>

                  {/* Column 2: Note and technical token as secondary muted tag */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ color: 'var(--bthwani-control-panel-text)' }}>{item.note}</span>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '9px', background: 'var(--bthwani-control-panel-surface-inset)', color: 'var(--bthwani-control-panel-text-muted)', padding: '1px 5px', borderRadius: '4px' }}>
                        المعرّف: <span dir="ltr" style={{ display: 'inline-block' }}>{item.id}</span>
                      </span>
                    </div>
                  </div>

                  {/* Column 3: Proof and Ticket link */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text)' }}>{item.proofRequired}</span>
                    <span style={{ fontSize: '10px', color: 'var(--bthwani-control-panel-brand)' }}>{item.supportTicketLink}</span>
                  </div>

                  {/* Column 4: Status and Time */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div>
                      <WebControlPanelStatusTag label={item.permissionResult} tone={statusTone} />
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--bthwani-control-panel-text-muted)' }}>{item.when}</span>
                  </div>

                  {/* Column 5: Inspect button */}
                  <button
                    type="button"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--bthwani-control-panel-brand)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      width: '40px',
                      textAlign: 'center',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailOrderId(isSelected ? null : item.id);
                    }}
                    aria-label="فتح التفاصيل"
                  >
                    {isSelected ? '◀' : '►'}
                  </button>
                </div>
              );
            })}
          </WebControlPanelQueue>
        </Box>

        <Box gap={4}>
          {detailOrderId !== null ? (
            <AuditTrailDetailWorkspace
              orderId={detailOrderId}
              auditEntry={resolveAuditEntry(detailOrderId)}
              onClose={() => setDetailOrderId(null)}
            />
          ) : (
            <WebControlPanelRecommendation
              title="تفاصيل سجل التدقيق"
              reason="اختر أحد التدقيقات التشغيلية من سجل التدقيق لمعاينة تفاصيل الإثبات ومراجعة SLA."
              confidence="high"
              auditTag="NEEDS_RUNTIME_EVIDENCE"
            />
          )}
        </Box>
      </div>
    </Box>
  );
}

export default AuditSupportSlaScreen;
