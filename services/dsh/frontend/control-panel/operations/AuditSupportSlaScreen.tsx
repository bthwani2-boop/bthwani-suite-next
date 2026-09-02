'use client';

import React from 'react';
import { Box } from '@bthwani/ui-kit';
import {
  WebControlPanelKpiStrip,
  WebControlPanelQueue,
  WebControlPanelRecommendation,
  WebControlPanelStatusTag,
} from '@bthwani/ui-kit/web';
import { AuditTrailDetailWorkspace } from './AuditTrailDetailWorkspace';
import {
  classifyOrderTruthFailure,
  fetchOperatorOrderTruth,
  type OrderTruth,
} from '../../shared/order-truth';

export type AuditSupportSlaScreenProps = {
  readonly hubHref: string;
  readonly subGroup?: string;
};

type RuntimeReviewState = {
  readonly orders: readonly OrderTruth[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly offline: boolean;
};

const REVIEW_STATUSES = new Set([
  'delivered',
  'cancelled_by_client',
  'cancelled_by_store',
  'cancelled_by_operator',
  'cancelled_no_driver',
  'failed_payment',
  'failed_dispatch',
  'returning_to_store',
  'return_arrived_store',
  'returned_to_store',
]);

/**
 * Runtime-backed operational review queue.
 *
 * This surface intentionally does not claim to be an audit ledger. DSH has not
 * exposed a canonical audit-entry read contract for this route, so actor,
 * permission, reason and evidence rows remain unavailable instead of being
 * synthesized in the browser.
 */
export function AuditSupportSlaScreen({
  hubHref: _hubHref,
  subGroup: _subGroup,
}: AuditSupportSlaScreenProps) {
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);
  const [state, setState] = React.useState<RuntimeReviewState>({
    orders: [],
    isLoading: true,
    error: null,
    offline: false,
  });

  React.useEffect(() => {
    let cancelled = false;
    setState((current) => ({ ...current, isLoading: true, error: null, offline: false }));

    void fetchOperatorOrderTruth({ limit: 50 }).then((orders) => {
      if (cancelled) return;

      setState({
        orders: orders.filter((order) => REVIEW_STATUSES.has(order.status)),
        isLoading: false,
        error: null,
        offline: false,
      });
    }).catch((error: unknown) => {
      if (cancelled) return;
      const failure = classifyOrderTruthFailure(error, 'operator');
      setState({
        orders: [],
        isLoading: false,
        error: failure.kind === 'offline' ? null : failure.message,
        offline: failure.kind === 'offline',
      });
    });

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  const selectedOrder = state.orders.find((order) => order.id === selectedOrderId);
  const loaded = !state.isLoading && !state.error && !state.offline;
  const failureCount = state.orders.filter((order) =>
    order.status.startsWith('failed_'),
  ).length;
  const timelineEventCount = state.orders.reduce(
    (total, order) => total + order.statusTimeline.length,
    0,
  );

  const summaryKpi = [
    {
      id: 'runtime-review',
      label: 'مراجعات تشغيلية',
      value: loaded ? String(state.orders.length) : '—',
      tone: 'warning' as const,
    },
    {
      id: 'timeline-events',
      label: 'أحداث الحالة المتاحة',
      value: loaded ? String(timelineEventCount) : '—',
      tone: 'neutral' as const,
    },
    {
      id: 'failures',
      label: 'حالات فشل',
      value: loaded ? String(failureCount) : '—',
      tone: failureCount > 0 ? 'danger' as const : 'neutral' as const,
    },
    {
      id: 'audit-authority',
      label: 'عقد التدقيق',
      value: 'غير متاح',
      tone: 'warning' as const,
    },
  ];

  return (
    <Box gap={3}>
      <WebControlPanelKpiStrip items={summaryKpi} />

      {(state.error || state.offline) ? (
        <div
          style={{
            padding: '10px 12px',
            border: '1px solid var(--bthwani-control-panel-border)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--bthwani-control-panel-text-muted)' }}>
            {state.offline
              ? 'لا يوجد اتصال بخدمة DSH؛ لا توجد بيانات محلية بديلة.'
              : `تعذر تحميل مراجعات DSH: ${state.error}`}
          </span>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            style={{
              fontSize: '12px',
              color: 'var(--bthwani-control-panel-brand)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.35fr) minmax(320px, 0.65fr)',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        <WebControlPanelQueue
          title="طلبات DSH التي تحتاج مراجعة تشغيلية"
          meta={state.isLoading ? 'جارٍ التحميل' : `${state.orders.length} طلب`}
        >
          {loaded && state.orders.length === 0 ? (
            <div style={{ padding: '12px', fontSize: '12px', color: 'var(--bthwani-control-panel-text-muted)' }}>
              لا توجد طلبات ضمن حالات المراجعة الحالية.
            </div>
          ) : null}

          {state.orders.map((order) => {
            const selected = order.id === selectedOrderId;
            const danger = order.status.startsWith('failed_');
            return (
              <button
                key={order.id}
                type="button"
                onClick={() => setSelectedOrderId(selected ? null : order.id)}
                style={{
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr 1fr auto',
                  gap: '8px',
                  alignItems: 'center',
                  padding: '10px 12px',
                  background: selected
                    ? 'var(--bthwani-brand-surface)'
                    : 'var(--bthwani-control-panel-surface)',
                  border: selected
                    ? '1px solid var(--bthwani-brand)'
                    : '1px solid var(--bthwani-control-panel-border)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'start',
                }}
              >
                <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <strong dir="ltr" style={{ fontSize: '11px' }}>{order.id}</strong>
                  <span style={{ fontSize: '10px', color: 'var(--bthwani-control-panel-text-muted)' }}>
                    متجر: {order.storeId}
                  </span>
                </span>
                <WebControlPanelStatusTag
                  label={order.status}
                  tone={danger ? 'danger' : 'neutral'}
                />
                <span style={{ fontSize: '10px', color: 'var(--bthwani-control-panel-text-muted)' }}>
                  المالك الحالي: {order.currentOwner}
                </span>
                <span aria-hidden>{selected ? '◀' : '►'}</span>
              </button>
            );
          })}
        </WebControlPanelQueue>

        {selectedOrder ? (
          <AuditTrailDetailWorkspace
            orderId={selectedOrder.id}
            order={selectedOrder}
            onClose={() => setSelectedOrderId(null)}
          />
        ) : (
          <WebControlPanelRecommendation
            title="التدقيق الحقيقي غير مربوط"
            reason="اختر طلبًا لمراجعة حقائقه التشغيلية. لا تُعرض هوية منفّذ أو صلاحية أو سبب أو دليل تدقيق حتى يوفّر DSH عقد read-only حاكمًا لهذه البيانات."
            confidence="high"
            auditTag="AUDIT_CONTRACT_REQUIRED"
          />
        )}
      </div>
    </Box>
  );
}

export default AuditSupportSlaScreen;
