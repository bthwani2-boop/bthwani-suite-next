import React from 'react';
import { useRouter } from 'next/navigation';
import {
  WebControlPanelKpiStrip,
  WebControlPanelDecisionRow,
  WebControlPanelRecommendation,
  WebControlPanelQueue,
  WebControlPanelInspectorShell,
  WebControlPanelStatusTag,
} from '@bthwani/ui-kit/web';
import { Box, KeyValueList } from '@bthwani/ui-kit';
import styles from '../shared/control-panel-surface.module.css';
import type { DshOperationsDecisionKind, DshOrderLifecycleStatus } from '../../shared/orders';
import { mapOperationsDecisionToLifecycle } from '../../shared/orders';
import { buildOperationsHref } from './operations.registry';
import { getLiveOrderDecisions, updateLiveOrderDecision } from '../../shared/partner/partner.workflow';
import { OpsOrderDetailPanel, type DshOpsApprovalOrder } from './OpsOrderDetailPanel';
import { opsTheme as theme } from '../../shared/operations';

const PENDING_APPROVAL_ORDERS: DshOpsApprovalOrder[] = [];
import { getOperationsActorLabel } from './FulfillmentModeQueueSection';
import type { DshFulfillmentOperationalMode } from './operations.types';
import { DSH_FULFILLMENT_OPERATIONAL_MODE_META } from './operations.types';
import { fetchDshRuntimeOrders, type DshRuntimeOrderRow } from '../../shared/operations/dsh-operational-runtime-adapter';
import {
  DSH_CONTROL_PANEL_TONE_MAP,
  resolveRuntimeOrderStatusTone,
  type DshControlPanelTone,
} from '../../shared/runtime';

export type LiveOrdersScreenProps = {
  state?: 'ready' | 'loading' | 'error' | 'empty';
  hubHref: string;
  subGroup?: string;
  onRetry?: () => void;
};

type OpsDecision = DshOperationsDecisionKind;
type DecisionState = Record<string, { decision: OpsDecision; note: string; submitted: boolean; nextLifecycleStatus: DshOrderLifecycleStatus }>;
type SelectedItem =
  | { type: 'approval'; id: string }
  | { type: 'live'; id: string }
  | { type: 'fulfillment'; id: string; mode: DshFulfillmentOperationalMode }
  | null;

const FULFILLMENT_MODE_IDS: readonly DshFulfillmentOperationalMode[] = ['bthwani_delivery', 'partner_delivery', 'pickup'];

export function LiveOrdersScreen({ state = 'ready', subGroup, onRetry }: LiveOrdersScreenProps) {
  const router = useRouter();
  const PREVIEW_ROWS: { id: string; destination: string; captain: string; status: string; statusTone: DshControlPanelTone; suggestion: { label: string; reason: string; action: string; secondary: string }; eta: string; ringLabel: string; fulfillmentMode: DshFulfillmentOperationalMode; arrivalTimeline: string[]; actionPlans: string[] }[] = [];
  const activeMode = FULFILLMENT_MODE_IDS.find((m) => m === subGroup) ?? null;
  const [selectedItemId, setSelectedItemId] = React.useState<SelectedItem>(null);
  const [decisions, setDecisions] = React.useState<DecisionState>(() => getLiveOrderDecisions());
  const [actionFeedback, setActionFeedback] = React.useState<string | null>(null);
  const [retryCount, setRuntimeRetryCount] = React.useState(0);
  const retry = React.useCallback(() => setRuntimeRetryCount((n) => n + 1), []);
  const [runtimeState, setRuntimeState] = React.useState<{
    orders: readonly DshRuntimeOrderRow[];
    total: number;
    loaded: boolean;
    offline: boolean;
    error: string | null;
  }>({ orders: [], total: 0, loaded: false, offline: false, error: null });

  React.useEffect(() => {
    let cancelled = false;
    fetchDshRuntimeOrders({ limit: 100 }).then((result) => {
      if (cancelled) return;
      if (result.kind === 'ok') {
        setRuntimeState({ orders: result.orders, total: result.total, loaded: true, offline: false, error: null });
      } else if (result.kind === 'offline') {
        setRuntimeState((s) => ({ ...s, offline: true, loaded: false }));
      } else {
        setRuntimeState((s) => ({ ...s, error: result.message, loaded: false }));
      }
    });
    return () => { cancelled = true; };
  }, [retryCount]);

  const handleDecision = React.useCallback((orderId: string, decision: OpsDecision, note: string) => {
    const nextStatus = mapOperationsDecisionToLifecycle(decision);
    updateLiveOrderDecision(orderId, decision, note, nextStatus);
    setDecisions(getLiveOrderDecisions());
    setSelectedItemId(null);
  }, []);

  const handlePrimaryAction = React.useCallback((orderId: string, actionLabel: string) => {
    if (actionLabel.includes('إسناد')) {
      router.push(buildOperationsHref('dispatch-assignment', { orderId }));
    } else if (actionLabel.includes('إثبات') || actionLabel.includes('طلب')) {
      setActionFeedback(`تم طلب إثبات الاستلام للطلب ${orderId} بنجاح. قيد المتابعة مع الدعم.`);
      setTimeout(() => setActionFeedback(null), 3500);
    } else {
      router.push(buildOperationsHref('order-rescue', { orderId }));
    }
  }, [router]);

  const handleSecondaryAction = React.useCallback((orderId: string, actionLabel: string) => {
    if (actionLabel.includes('دعم') || actionLabel.includes('الدعم')) {
      router.push(`/support?orderId=${orderId}`);
    } else {
      router.push(buildOperationsHref('order-rescue', { orderId }));
    }
  }, [router]);

  if (state === 'loading') {
    return (
      <div className={styles.surfaceInnerScroll} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <p style={{ color: theme.textMuted, fontSize: '13px' }}>جارٍ تحميل العمليات الحية...</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className={styles.surfaceInnerScroll} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <div style={{ textAlign: 'center', border: `1px solid ${theme.danger}`, padding: '24px', borderRadius: '10px', background: theme.dangerSurface }}>
          <p style={{ color: theme.dangerText, fontSize: '13px', marginBottom: '12px' }}>تعذر الاتصال بخادم العمليات المباشرة.</p>
          <button type="button" onClick={onRetry} style={{ padding: '6px 18px', background: theme.danger, color: theme.textInverse, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}>إعادة المحاولة</button>
        </div>
      </div>
    );
  }

  const runtimeActive = runtimeState.loaded;
  const liveOrderCount = runtimeActive ? runtimeState.total : PREVIEW_ROWS.length;
  const dataSourceLabel = runtimeActive ? 'DSH Runtime' : '—';
  const dataSourceTone: 'success' | 'warning' = runtimeActive ? 'success' : 'warning';

  const summaryKpi = [
    { id: 'live', label: 'الطلبات النشطة', value: String(liveOrderCount), tone: 'neutral' as const },
    { id: 'pending-approval', label: 'قيد الموافقة', value: String(PENDING_APPROVAL_ORDERS.filter((o) => !decisions[o.id]).length), tone: 'warning' as const },
    { id: 'source', label: 'مصدر البيانات', value: dataSourceLabel, tone: dataSourceTone },
    { id: 'blocked', label: 'رنينات محجوبة', value: '—', tone: 'danger' as const },
  ];

  const pendingApprovalsCount = PENDING_APPROVAL_ORDERS.filter((o) => !decisions[o.id]).length;

  // Selected details lookup
  let inspectorContent: React.ReactNode = null;
  if (selectedItemId) {
    if (selectedItemId.type === 'approval') {
      const order = PENDING_APPROVAL_ORDERS.find((o) => o.id === selectedItemId.id);
      if (order) {
        inspectorContent = (
          <WebControlPanelInspectorShell
            title={`موافقة تشغيلية — ${order.id}`}
            onClose={() => setSelectedItemId(null)}
          >
            <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
              <OpsOrderDetailPanel order={order} onDecision={handleDecision} />
            </div>
          </WebControlPanelInspectorShell>
        );
      }
    } else if (selectedItemId.type === 'live') {
      const order = PREVIEW_ROWS.find((r) => r.id === selectedItemId.id);
      if (order) {
        inspectorContent = (
          <WebControlPanelInspectorShell
            title={`تفاصيل الطلب الحي — ${order.id}`}
            onClose={() => setSelectedItemId(null)}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 800 }}>الحالة الحالية:</span>
                <WebControlPanelStatusTag
                  label={order.status}
                  tone={DSH_CONTROL_PANEL_TONE_MAP[order.statusTone] ?? 'neutral'}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {[
                  { label: 'الوجهة', value: order.destination },
                  { label: 'الكابتن', value: order.captain },
                  { label: 'ETA المتوقع', value: order.eta },
                  { label: 'تنبيه الوصول', value: order.ringLabel },
                  { label: 'توجيه الإجراء', value: order.suggestion.action },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: 'var(--bthwani-control-panel-surface-inset)', borderRadius: '6px', padding: '6px 10px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--bthwani-control-panel-text-muted)', marginBottom: '2px' }}>{label}</div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bthwani-control-panel-text)' }}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--bthwani-control-panel-border)', paddingTop: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--bthwani-control-panel-brand)' }}>توصية النظام المعتمدة:</div>
                <p style={{ fontSize: '12px', color: 'var(--bthwani-control-panel-text)', marginTop: '4px', fontWeight: 700 }}>
                  {order.suggestion.label}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text-muted)', marginTop: '2px' }}>
                  {order.suggestion.reason}
                </p>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--bthwani-control-panel-text)', marginBottom: '4px' }}>سجل الوصول والتنبيهات:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {order.arrivalTimeline.map((item, index) => (
                    <div key={index} style={{ fontSize: '11px', padding: '4px 6px', background: 'var(--bthwani-control-panel-surface-inset)', borderRadius: '4px' }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--bthwani-control-panel-text)', marginBottom: '4px' }}>خطط الإجراء التشغيلي:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {order.actionPlans.map((item, index) => (
                    <div key={index} style={{ fontSize: '11px', padding: '4px 6px', background: 'var(--bthwani-control-panel-surface-inset)', borderRadius: '4px' }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: 'var(--bthwani-control-panel-brand)',
                    color: 'var(--bthwani-brand-contrast)',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '11px',
                  }}
                  onClick={() => handlePrimaryAction(order.id, order.suggestion.action)}
                >
                  {order.suggestion.action}
                </button>
                {order.suggestion.secondary && (
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: 'transparent',
                      border: '1px solid var(--bthwani-control-panel-border-strong)',
                      color: 'var(--bthwani-control-panel-text)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '11px',
                    }}
                    onClick={() => handleSecondaryAction(order.id, order.suggestion.secondary)}
                  >
                    {order.suggestion.secondary}
                  </button>
                )}
              </div>
              {actionFeedback && (
                <div className={styles.overrideNotification} style={{ marginTop: '8px', textAlign: 'center' }}>
                  {actionFeedback}
                </div>
              )}
            </div>
          </WebControlPanelInspectorShell>
        );
      }
    } else if (selectedItemId.type === 'fulfillment') {
      const rows: { id: string; storeName: string; customerName: string; slaLabel: string; statusTone: DshControlPanelTone; statusLabel: string; nextAction: string; fulfillmentMode: DshFulfillmentOperationalMode }[] = [];
      const order = rows.find((r) => r.id === selectedItemId.id);
      if (order) {
        inspectorContent = (
          <WebControlPanelInspectorShell
            title={`تفاصيل طلب التوصيل — ${order.id}`}
            onClose={() => setSelectedItemId(null)}
          >
            <Box gap={3} padding={2}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 800 }}>الحالة:</span>
                <WebControlPanelStatusTag
                  label={order.statusLabel}
                  tone={order.statusTone}
                />
              </div>

              <KeyValueList
                items={[
                  { label: 'مُعرّف الطلب', value: order.id },
                  { label: 'المتجر', value: order.storeName },
                  { label: 'العميل', value: order.customerName },
                  { label: 'SLA المتبقي', value: order.slaLabel },
                  { label: 'قناة التنفيذ', value: DSH_FULFILLMENT_OPERATIONAL_MODE_META[order.fulfillmentMode]?.label || order.fulfillmentMode },
                  { label: 'المالك التشغيلي', value: DSH_FULFILLMENT_OPERATIONAL_MODE_META[order.fulfillmentMode]?.operationalOwner || 'غير محدد' },
                ]}
              />

              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: 'var(--bthwani-control-panel-brand)',
                    color: 'var(--bthwani-brand-contrast)',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '11px',
                  }}
                  onClick={() => {
                    setActionFeedback(`تم اتخاذ الإجراء: ${order.nextAction} للطلب ${order.id}`);
                    setTimeout(() => setActionFeedback(null), 3500);
                  }}
                >
                  {order.nextAction}
                </button>
              </div>
              {actionFeedback && (
                <div className={styles.overrideNotification} style={{ marginTop: '8px', textAlign: 'center' }}>
                  {actionFeedback}
                </div>
              )}
            </Box>
          </WebControlPanelInspectorShell>
        );
      }
    }
  }

  return (
    <Box gap={3}>
      <WebControlPanelKpiStrip items={summaryKpi} />

      {actionFeedback && !selectedItemId && (
        <div className={styles.overrideNotification} style={{ padding: '8px 12px', background: 'var(--bthwani-control-panel-surface-inset)', border: '1px solid var(--bthwani-control-panel-border)', borderRadius: '8px', textAlign: 'center' }}>
          {actionFeedback}
        </div>
      )}

      <div className={styles.surfaceSplitGrid}>
        <Box gap={3}>
          {/* 1. Pending Approvals Queue */}
          <WebControlPanelQueue
            title="طلبات قيد الموافقة التشغيلية"
            meta={`${pendingApprovalsCount} طلبات معلقة`}
          >
            {PENDING_APPROVAL_ORDERS.map((order) => {
              const submitted = decisions[order.id];
              if (submitted) {
                const decisionLabel = submitted.decision === 'approve' ? 'تمت الموافقة' : submitted.decision === 'reject' ? 'تم الرفض' : 'طلب تعديل';
                const decisionTone = submitted.decision === 'approve' ? 'success' as const : submitted.decision === 'reject' ? 'danger' as const : 'warning' as const;
                return (
                  <WebControlPanelDecisionRow
                    key={order.id}
                    entityId={order.id}
                    entityLabel={`${order.customerName} — ${order.storeName}`}
                    status={decisionLabel}
                    statusTone={decisionTone}
                    sla={`الحالة التالية: ${submitted.nextLifecycleStatus}`}
                  />
                );
              }

              return (
                <WebControlPanelDecisionRow
                  key={order.id}
                  entityId={order.id}
                  entityLabel={`${order.customerName} — ${order.storeName}`}
                  status="قيد مراجعة العمليات"
                  statusTone="warning"
                  onInspect={() => setSelectedItemId({ type: 'approval', id: order.id })}
                  primaryAction={{
                    id: `${order.id}-decide`,
                    label: 'مراجعة واتخاذ قرار',
                    onAction: () => setSelectedItemId({ type: 'approval', id: order.id }),
                  }}
                />
              );
            })}
          </WebControlPanelQueue>

          {/* 2. Live Orders Queue — runtime when available, preview fallback */}
          <WebControlPanelQueue
            title={runtimeActive ? 'الطلبات المباشرة (Runtime)' : 'الطلبات المباشرة (Preview)'}
            meta={`${liveOrderCount} طلبات نشطة`}
          >
            {runtimeActive
              ? runtimeState.orders.map((order) => (
                  <WebControlPanelDecisionRow
                    key={order.id}
                    entityId={order.id}
                    entityLabel={`متجر: ${order.storeId} — عميل: ${order.clientId}${order.captainId ? ` — كابتن: ${order.captainId}` : ''}`}
                    status={order.status}
                    statusTone={resolveRuntimeOrderStatusTone(order.status)}
                    sla={`تاريخ الإنشاء: ${new Date(order.createdAt).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`}
                    onInspect={() => router.push(`/operations?group=exceptions&orderId=${order.id}`)}
                    {...(order.status === 'pending' ? {
                      primaryAction: {
                        id: `${order.id}-dispatch`,
                        label: 'إسناد كابتن',
                        onAction: () => router.push(`/operations?group=dispatch-capacity&orderId=${order.id}`),
                      },
                    } : {})}
                  />
                ))
              : PREVIEW_ROWS.map((order) => (
                  <WebControlPanelDecisionRow
                    key={order.id}
                    entityId={order.id}
                    entityLabel={`${order.destination} — ${getOperationsActorLabel(order.fulfillmentMode)}: ${order.captain}`}
                    status={order.status}
                    statusTone={DSH_CONTROL_PANEL_TONE_MAP[order.statusTone] ?? 'neutral'}
                    risk={DSH_CONTROL_PANEL_TONE_MAP[order.statusTone] === 'danger' ? 'danger' : DSH_CONTROL_PANEL_TONE_MAP[order.statusTone] === 'warning' ? 'warning' : 'neutral'}
                    recommendation={order.suggestion.label}
                    reason={order.suggestion.reason}
                    sla={`ETA: ${order.eta} | ${order.ringLabel}`}
                    onInspect={() => setSelectedItemId({ type: 'live', id: order.id })}
                    primaryAction={{
                      id: `${order.id}-primary`,
                      label: order.suggestion.action,
                      onAction: () => handlePrimaryAction(order.id, order.suggestion.action),
                    }}
                    {...(order.suggestion.secondary ? {
                      secondaryAction: {
                        id: `${order.id}-secondary`,
                        label: order.suggestion.secondary,
                        onAction: () => handleSecondaryAction(order.id, order.suggestion.secondary),
                      },
                    } : {})}
                  />
                ))
            }
          </WebControlPanelQueue>

          {/* 3. Fulfillment Mode subGroup Queue (if active) */}
          {activeMode && (
            <WebControlPanelQueue
              title={DSH_FULFILLMENT_OPERATIONAL_MODE_META[activeMode]?.label || activeMode}
              meta={DSH_FULFILLMENT_OPERATIONAL_MODE_META[activeMode]?.operationalOwner}
            >
              {([] as { id: string; customerName: string; storeName: string; statusLabel: string; statusTone: DshControlPanelTone; slaLabel: string; nextAction: string }[]).map((row) => (
                <WebControlPanelDecisionRow
                  key={row.id}
                  entityId={row.id}
                  entityLabel={`${row.customerName} — ${row.storeName}`}
                  status={row.statusLabel}
                  statusTone={row.statusTone}
                  sla={row.slaLabel}
                  onInspect={() => setSelectedItemId({ type: 'fulfillment', id: row.id, mode: activeMode })}
                  primaryAction={{
                    id: `${row.id}-action`,
                    label: row.nextAction,
                    onAction: () => {
                      setActionFeedback(`تم اتخاذ الإجراء: ${row.nextAction} للطلب ${row.id}`);
                      setTimeout(() => setActionFeedback(null), 3500);
                    },
                  }}
                />
              ))}
            </WebControlPanelQueue>
          )}
        </Box>

        <Box gap={4}>
          {inspectorContent ?? (
            <WebControlPanelRecommendation
              title="تفاصيل الإجراء والتحكم"
              reason="اختر طلباً معلقاً للموافقة، أو طلباً مباشراً نشطاً من قائمة العمليات الحية لعرض تفاصيل الإجراء وسجل التنبيهات الموصى بها."
              confidence="high"
              auditTag="LIVE_ORDERS_MONITOR"
            />
          )}
        </Box>
      </div>
    </Box>
  );
}

export default LiveOrdersScreen;
