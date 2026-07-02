'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  WebControlPanelKpiStrip,
  WebControlPanelDecisionRow,
  WebControlPanelInspectorShell,
  WebControlPanelRecommendation,
} from '@bthwani/ui-kit/web';
import { fetchDshRuntimeOrders, type DshRuntimeOrderRow } from '../../shared/operations/dsh-operational-runtime-adapter';
import { DISPATCH_LIFECYCLE_STATE_MAP } from '../../shared/orders';
import { getDshOrderLifecycleRuntimeClient } from '../../shared';
import { Box, Text } from '@bthwani/ui-kit';
import styles from '../shared/control-panel-surface.module.css';
import { buildOperationsHref } from './operations.registry';
import { getDshLifecycleStateMetadata } from '../../shared/orders';
import { DSH_CONTROL_PANEL_TONE_MAP } from '../../shared/runtime';
// SSoT: dispatch queue visibility is owned by dsh-fulfillment-surface-visibility.
// Do not duplicate delivery-mode dispatch logic inline — use these helpers.
import {
  shouldEnterDispatchQueueForMode,
  shouldShowCaptainAssignmentInCP,
  getSurfaceRoleSummaryForMode,
} from '../../shared/identity-access/surface-visibility.policy';

export type DispatchAssignmentScreenProps = { hubHref: string; subGroup?: string };

// SSoT: resolved once at module level — bthwani_delivery is the only mode
// that enters the captain dispatch queue.
const DISPATCH_QUEUE_APPLIES_TO_BTHWANI = shouldEnterDispatchQueueForMode('bthwani_delivery');
const SHOW_CAPTAIN_ASSIGNMENT_IN_CP = shouldShowCaptainAssignmentInCP('bthwani_delivery');
const DISPATCH_SCOPE_LABEL = getSurfaceRoleSummaryForMode('control-panel', 'bthwani_delivery');

const alternativesMap: Record<string, Array<{ name: string; distance: string; status: string }>> = {
  'DA-2001': [
    { name: 'سعد م.', distance: '1.2 كم', status: 'متاح (موصى به)' },
    { name: 'خالد أ.', distance: '1.5 كم', status: 'متاح' },
    { name: 'ماجد س.', distance: '2.1 كم', status: 'متاح' },
  ],
  'DA-2002': [
    { name: 'محمد ع.', distance: '0.8 كم', status: 'متاح (موصى به)' },
    { name: 'عمر ف.', distance: '1.1 كم', status: 'متاح' },
    { name: 'علي ي.', distance: '1.8 كم', status: 'متاح' },
  ],
  'DA-2003': [
    { name: 'وليد ع.', distance: '3.4 كم', status: 'متاح (بعيد)' },
    { name: 'أحمد ر.', distance: '4.2 كم', status: 'متاح (بعيد)' },
  ],
};

type DispatchRowState = {
  id: string;
  captain: string;
  distance: string;
  confidence: string;
  statusTone: string;
  status: string;
  recommendation: string;
  note: string;
  blocker: string;
  pickupEta: string;
  dropoffEta: string;
  assignedCaptain: string | null;
  customStatus: string | null;
  customStatusTone: 'warning' | 'success' | 'danger' | 'neutral' | null;
  [key: string]: unknown;
};

function buildRuntimeDispatchRow(o: DshRuntimeOrderRow): DispatchRowState {
  return {
    id: o.id,
    captain: o.captainId ?? 'لا يوجد',
    distance: '—',
    confidence: '—',
    statusTone: o.status === 'CREATED' ? 'warning' : 'brand',
    status: o.status,
    recommendation: o.status === 'CREATED' ? 'يحتاج إسناد كابتن' : `الحالة: ${o.status}`,
    note: `متجر: ${o.storeId} | عميل: ${o.clientId}`,
    blocker: 'لا يوجد',
    pickupEta: '—',
    dropoffEta: '—',
    assignedCaptain: o.captainId ?? null,
    customStatus: null,
    customStatusTone: null,
  };
}

export function DispatchAssignmentScreen({ subGroup }: DispatchAssignmentScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlOrderId = searchParams.get('orderId') ?? null;
  const [selectedRowId, setSelectedRowId] = React.useState<string | null>(null);
  const [runtimeLoaded, setRuntimeLoaded] = React.useState(false);
  const [runtimeOffline, setRuntimeOffline] = React.useState(false);
  const [runtimeError, setRuntimeError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);
  const retry = React.useCallback(() => setRetryCount((n) => n + 1), []);
  const client = React.useMemo(() => getDshOrderLifecycleRuntimeClient(), []);

  const [rows, setRows] = React.useState<DispatchRowState[]>(() => []);

  React.useEffect(() => {
    let cancelled = false;
    fetchDshRuntimeOrders({ status: 'CREATED', limit: 100 }).then((result) => {
      if (cancelled) return;
      if (result.kind === 'ok') {
        const isEmpty = result.orders.length === 0;
        if (!isEmpty) setRows(result.orders.map(buildRuntimeDispatchRow));
        setRuntimeLoaded(true);
        setRuntimeError(null);
        setRuntimeOffline(false);
      } else if (result.kind === 'offline') {
        setRuntimeOffline(true);
      } else {
        setRuntimeError(result.message);
      }
    });
    return () => { cancelled = true; };
  }, [retryCount]);

  React.useEffect(() => {
    if (urlOrderId) {
      setSelectedRowId(urlOrderId);
    }
  }, [urlOrderId]);

  const activeRow = rows.find((r) => r.id === selectedRowId);
  const [actionStatus, setActionStatus] = React.useState<'idle' | 'pending' | 'success'>('idle');
  const [chosenCaptain, setChosenCaptain] = React.useState<string>('');

  React.useEffect(() => {
    if (activeRow) {
      setChosenCaptain(activeRow.assignedCaptain || (activeRow.captain !== 'لا يوجد' ? activeRow.captain : ''));
      setActionStatus('idle');
    }
  }, [selectedRowId, activeRow]);

  const handleConfirmAssignment = React.useCallback((orderId: string, captainName: string) => {
    setActionStatus('pending');

    if (client) {
      client.assignCaptain(orderId, { captain_id: captainName })
        .then(() => {
          setActionStatus('success');
          setTimeout(() => {
            setRows((prevRows) =>
              prevRows.map((r) =>
                r.id === orderId
                  ? {
                      ...r,
                      assignedCaptain: captainName,
                      customStatus: 'تم الإسناد للكابتن',
                      customStatusTone: 'success',
                    }
                  : r
              )
            );
            setActionStatus('idle');
            setSelectedRowId(null);
            router.push(buildOperationsHref('dispatch-assignment'));
          }, 1000);
        })
        .catch((err: unknown) => {
          console.error('Failed to assign captain via API:', err);
          setActionStatus('idle');
        });
    } else {
      // Fallback for preview/local dev without active API
      setTimeout(() => {
        setActionStatus('success');
        setTimeout(() => {
          setRows((prevRows) =>
            prevRows.map((r) =>
              r.id === orderId
                ? {
                    ...r,
                    assignedCaptain: captainName,
                    customStatus: 'تم الإسناد للكابتن',
                    customStatusTone: 'success',
                  }
                : r
            )
          );
          setActionStatus('idle');
          setSelectedRowId(null);
          router.push(buildOperationsHref('dispatch-assignment'));
        }, 1000);
      }, 1200);
    }
  }, [router]);

  const summaryKpi = [
    { id: 'waiting', label: 'بانتظار الإسناد', value: String(rows.filter(r => !r.assignedCaptain && r.statusTone !== 'danger').length), tone: 'danger' as const },
    { id: 'captains', label: 'كباتن متاحون', value: '—', tone: 'success' as const },
    { id: 'source', label: 'مصدر البيانات', value: runtimeLoaded ? 'DSH Runtime' : 'Preview', tone: runtimeLoaded ? 'success' as const : 'warning' as const },
    { id: 'blockers', label: 'معوقات الإسناد', value: String(rows.filter(r => r.statusTone === 'danger').length), tone: 'warning' as const },
  ];

  // Inspector component
  let inspectorContent: React.ReactNode = null;
  if (selectedRowId && activeRow) {
    const captainsList = alternativesMap[activeRow.id] || [];
    const isCompleted = activeRow.customStatus === 'تم الإسناد للكابتن';

    inspectorContent = (
      <WebControlPanelInspectorShell
        title={`إسناد وتعيين الكابتن — ${activeRow.id}`}
        onClose={() => {
          setSelectedRowId(null);
          router.push(buildOperationsHref('dispatch-assignment'));
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', overflowY: 'auto', flex: 1, direction: 'rtl', textAlign: 'right' }}>
          <div style={{ background: 'var(--bthwani-control-panel-surface-inset)', border: '1px solid var(--bthwani-control-panel-border)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text-muted)' }}>تفاصيل الطلب الحالي</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--bthwani-control-panel-brand)' }}>{activeRow.id}</div>
            <div style={{ fontSize: '12px', color: 'var(--bthwani-control-panel-text)' }}>
              <strong>التوصية المقترحة:</strong> {activeRow.recommendation}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--bthwani-control-panel-text-muted)' }}>
              {activeRow.note}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800 }}>اختر الكابتن للتعيين:</span>
            {captainsList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {captainsList.map((cap) => (
                  <label
                    key={cap.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: chosenCaptain === cap.name ? 'var(--bthwani-control-panel-brand-surface)' : 'var(--bthwani-control-panel-surface-inset)',
                      border: chosenCaptain === cap.name ? '1px solid var(--bthwani-control-panel-brand)' : '1px solid var(--bthwani-control-panel-border)',
                      borderRadius: '8px',
                      cursor: isCompleted || actionStatus !== 'idle' ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <input
                      type="radio"
                      name="captain-select"
                      value={cap.name}
                      checked={chosenCaptain === cap.name}
                      disabled={isCompleted || actionStatus !== 'idle'}
                      onChange={() => setChosenCaptain(cap.name)}
                      style={{ accentColor: 'var(--bthwani-control-panel-brand)' }}
                    />
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span><strong>{cap.name}</strong> ({cap.status})</span>
                      <span style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text-muted)' }}>{cap.distance}</span>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text-muted)' }}>لا يوجد كباتن متاحون بالقرب.</span>
            )}
          </div>

          {isCompleted ? (
            <div style={{ background: 'var(--bthwani-control-panel-success-surface)', border: '1px solid var(--bthwani-control-panel-success)', color: 'var(--bthwani-control-panel-success-text)', borderRadius: '8px', padding: '10px', fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>
              ✓ تم تعيين الكابتن وإرسال الطلب للمتابعة بنجاح!
            </div>
          ) : (
            <>
              {actionStatus === 'success' && (
                <div style={{ background: 'var(--bthwani-control-panel-success-surface)', border: '1px solid var(--bthwani-control-panel-success)', color: 'var(--bthwani-control-panel-success-text)', borderRadius: '8px', padding: '10px', fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>
                  ✓ تم تأكيد الإسناد وإرسال الطلب بنجاح!
                </div>
              )}
              <button
                type="button"
                onClick={() => handleConfirmAssignment(activeRow.id, chosenCaptain)}
                disabled={!chosenCaptain || actionStatus !== 'idle'}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: !chosenCaptain || actionStatus !== 'idle' ? 'var(--bthwani-control-panel-border)' : 'var(--bthwani-control-panel-brand)',
                  color: 'var(--bthwani-text-inverse)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: !chosenCaptain || actionStatus !== 'idle' ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '13px',
                  transition: 'background 0.2s',
                  textAlign: 'center',
                }}
              >
                {actionStatus === 'pending' ? 'قيد إرسال الإسناد للكابتن...' : 'تأكيد التعيين وإرسال الطلب'}
              </button>
            </>
          )}
        </div>
      </WebControlPanelInspectorShell>
    );
  }

  return (
    <Box gap={3}>
      {/* SSoT: dispatch queue scope — derived from dsh-fulfillment-surface-visibility */}
      {DISPATCH_QUEUE_APPLIES_TO_BTHWANI && SHOW_CAPTAIN_ASSIGNMENT_IN_CP && (
        <Box paddingX={3} paddingY={1}>
          <Text role="bodySm" tone="muted">
            {`نطاق الإسناد: ${DISPATCH_SCOPE_LABEL} — توصيل المتجر والاستلام الذاتي لا يحتاجان تعيين كابتن.`}
          </Text>
        </Box>
      )}

      {/* KPI summary strip */}
      <WebControlPanelKpiStrip items={summaryKpi} />

      <div className={styles.surfaceInnerLayout}>
        <Box gap={4}>
          <Box paddingX={3} paddingY={1}>
            <Text role="bodySm" tone="muted">
              ترتبط صفوف الإسناد هنا الآن بحالات دورة الحياة الموحدة. تفاصيل الطلب تُفتح عند الطلب فقط، مع إبقاء هذه المساحة ملخصاً أولاً.
            </Text>
          </Box>

          {/* Decision rows — duplicate buttons eliminated, one primary action per row */}
          <Box gap={2}>
            {rows.map((item) => {
              const lifecycleState = DISPATCH_LIFECYCLE_STATE_MAP[item.id] ?? 'captain_assignment';
              const lifecycleMetadata = getDshLifecycleStateMetadata(lifecycleState);

              // Use dynamic states if they exist
              const resolvedCaptain = item.assignedCaptain || item.captain;
              const resolvedStatusLabel = item.customStatus || (lifecycleMetadata?.controlPanelLabel ?? item.status);
              const resolvedStatusTone = item.customStatusTone || DSH_CONTROL_PANEL_TONE_MAP[item.statusTone] || 'neutral';

              const primaryLabel = item.customStatus ? 'تم الإسناد' : (lifecycleMetadata?.primaryAction?.label ?? 'تأكيد الإسناد');

              const secondaryLabel = lifecycleState === 'reassignment_required'
                ? 'فتح الطلب الحي'
                : lifecycleState === 'captain_unavailable'
                  ? 'فتح السعة والمناطق'
                  : 'عرض التفاصيل';
              const reason = item.blocker !== 'لا يوجد'
                ? `حالة المسار: ${resolvedStatusLabel} · المانع: ${item.blocker}`
                : `حالة المسار: ${resolvedStatusLabel} · ${item.note}`;

              return (
                <WebControlPanelDecisionRow
                  key={item.id}
                  entityId={item.id}
                  entityLabel={`الكابتن: ${resolvedCaptain} | المسافة: ${item.distance} | الثقة: ${item.confidence}`}
                  status={resolvedStatusLabel}
                  statusTone={resolvedStatusTone}
                  risk={resolvedStatusTone === 'danger' ? 'danger' : resolvedStatusTone === 'warning' ? 'warning' : 'neutral'}
                  recommendation={item.recommendation}
                  reason={reason}
                  sla={`استلام: ${item.pickupEta} | تسليم: ${item.dropoffEta}`}
                  onInspect={() => {
                    setSelectedRowId(item.id);
                    router.push(buildOperationsHref('dispatch-assignment', { orderId: item.id }));
                  }}
                  primaryAction={item.customStatus ? undefined : {
                    id: `${item.id}-primary`,
                    label: primaryLabel,
                    onAction: () => {
                      setSelectedRowId(item.id);
                      router.push(buildOperationsHref('dispatch-assignment', { orderId: item.id }));
                    },
                  }}
                  secondaryAction={{
                    id: `${item.id}-secondary`,
                    label: secondaryLabel,
                    onAction: () => router.push(
                      lifecycleState === 'captain_unavailable'
                        ? buildOperationsHref('area-capacity')
                        : buildOperationsHref('live-orders', { orderId: item.id }),
                    ),
                  }}
                />
              );
            })}
          </Box>
        </Box>

        <Box gap={4}>
          {inspectorContent ?? (
            <WebControlPanelRecommendation
              title="تفاصيل الإسناد وتعيين الكابتن"
              reason="اختر طلباً بانتظار الإسناد من القائمة لعرض الكباتن المتاحين بالقرب وتأكيد التعيين."
              confidence="high"
              auditTag="DISPATCH_ASSIGNMENT_MONITOR"
            />
          )}
        </Box>
      </div>
    </Box>
  );
}

export default DispatchAssignmentScreen;
