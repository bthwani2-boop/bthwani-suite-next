'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Text } from '@bthwani/ui-kit';
import { WebControlPanelKpiStrip } from '@bthwani/ui-kit/web';
import { buildOperationsHref } from './operations.registry';
import styles from '../shared/control-panel-surface.module.css';
// SSoT: rescue triggers are derived from the lifecycle handoffs table.
// The control-panel sees rescue_required observations from partner_rejected and delivery_failed handoffs.
import {
  getHandoffsForSurface,
  type DshOrderRescueCase,
  type DshOrderRescueNextActionId,
  type DshOrderRescueOwner,
  type DshOrderRescueReason,
} from '../../shared/orders';

export type OrderRescueScreenProps = {
  hubHref: string;
  subGroup?: string;
};

export type RescueCase = DshOrderRescueCase;

// SSoT: handoffs that require rescue action from control-panel (rescue_required state).
// Derived from dsh-order-lifecycle-handoffs — do not hardcode rescue triggers inline.
const CP_RESCUE_REQUIRED_HANDOFFS = getHandoffsForSurface('control-panel').filter((h) =>
  h.surfaceObservations.some((o) => o.surfaceId === 'control-panel' && o.uiStateHint === 'rescue_required'),
);

import { RescueCaseRow } from './components/RescueCaseRow';

// ── Main screen ──────────────────────────────────────────────────────────────

export function OrderRescueScreen({ hubHref: _hubHref, subGroup: _subGroup }: OrderRescueScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [cases, setCases] = React.useState<RescueCase[]>(() => []);
  const [openRescueId, setOpenRescueId] = React.useState<string | null>(null);
  const [overriddenActions, setOverriddenActions] = React.useState<Record<string, boolean>>({});
  const [submitNotes, setSubmitNotes] = React.useState<Record<string, string | null>>({});
  const [retryCount, setRetryCount] = React.useState(0);
  const retry = React.useCallback(() => setRetryCount((n) => n + 1), []);
  const [runtimeState, setRuntimeState] = React.useState<{ loaded: boolean; offline: boolean; error: string | null }>({ loaded: false, offline: false, error: null });

  React.useEffect(() => {
    let cancelled = false;
    // For rescue, we fetch pending orders or orders that might need rescue. 
    // In DSH, we just fetch recent orders to simulate rescue triggers.
    import('../../shared/operations/dsh-operational-runtime-adapter').then(({ fetchDshRuntimeOrders }) => {
      fetchDshRuntimeOrders({ limit: 50, scope: 'operator' }).then((result) => {
        if (cancelled) return;
        if (result.kind === 'ok') {
          // Map to RescueCase
          const mappedCases: RescueCase[] = result.orders.map(o => ({
            rescueId: `RESCUE-${o.id}`,
            orderId: o.id,
            customerId: o.clientId,
            customerName: `عميل ${o.clientId.slice(0, 4)}`,
            blocker: o.status === 'pending' ? 'بانتظار المتجر' : 'تأخير استلام',
            severity: o.status === 'pending' ? 'warning' : 'danger',
            issueKind: 'customer_not_reachable',
            rescueReasonSelector: {
              selectedReason: 'customer_not_reachable',
              options: ['customer_not_reachable', 'item_unavailable', 'captain_declined'],
            },
            ownerSelection: {
              selectedOwner: 'support',
              options: ['support', 'operations', 'partner', 'captain'],
            },
            nextActionSelector: {
              selectedAction: 'wait_customer',
              options: ['wait_customer', 'replace_item', 'reassign_captain'],
            },
            requiredEvidence: { reason: '', affectedEntity: '', operatorNote: '' },
            forbiddenActions: [],
            supportHandoff: { ticketLink: `TKT-${o.id.slice(0, 4)}`, sla: '15m', routeHint: '/dsh/support' },
            wltImpactVisibility: { calculationTruthOwner: 'DSH', paymentVisibility: 'Read-only', refundVisibility: 'Read-only' },
            crossSurfaceLinks: [],
          }));
          setCases(mappedCases);
          setRuntimeState({ loaded: true, offline: false, error: null });
        } else if (result.kind === 'offline') {
          setRuntimeState({ loaded: false, offline: true, error: null });
        } else {
          setRuntimeState({ loaded: false, offline: false, error: result.message });
        }
      });
    });
    return () => { cancelled = true; };
  }, [retryCount]);

  // Deep-link: auto-open if URL contains a rescue/order context
  React.useEffect(() => {
    const requestedRescueId = searchParams.get('rescueId');
    const requestedOrderId = searchParams.get('orderId');
    if (!requestedRescueId && !requestedOrderId) return;

    const matched = cases.find(
      (rescueCase) =>
        rescueCase.rescueId === requestedRescueId ||
        rescueCase.orderId === requestedOrderId,
    );
    if (matched) setOpenRescueId(matched.rescueId);
  }, [cases, searchParams]);

  const kpis = React.useMemo(() => [
    { id: 'total',    label: 'حالات الإنقاذ', value: String(cases.length),                                                                                                                                                                             tone: 'neutral'  as const },
    { id: 'critical', label: 'حرجة',          value: String(cases.filter((c) => c.severity === 'danger').length),                                                                                                                                        tone: 'danger'   as const },
    { id: 'wlt',      label: 'WLT',           value: String(cases.filter((c) => c.issueKind === 'payment_failure' || c.issueKind === 'wlt_visibility' || c.ownerSelection.selectedOwner === 'wlt_reference_only').length),                             tone: 'warning'  as const },
    { id: 'audit',    label: 'تدقيق مطلوب',   value: 'نعم',                                                                                                                                                                                             tone: 'success'  as const },
  ], [cases]);

  // Immutable updater — only mutates the targeted rescueId
  const updateCase = React.useCallback(
    (rescueId: string, updater: (c: RescueCase) => RescueCase) =>
      setCases((prev) => prev.map((c) => (c.rescueId === rescueId ? updater(c) : c))),
    [],
  );

  return (
    <Box gap={3}>
      <div className={styles.surfaceSectionHeader}>
        <h2 className={styles.surfaceSectionTitle}>إنقاذ الطلبات</h2>
        <p className={styles.surfaceSectionSubtitle}>
          اضغط على أي طلب لعرض خطوات الإنقاذ والتحكم الكامل — ينسدل من الطلب مباشرة.
        </p>
      </div>

      <WebControlPanelKpiStrip items={kpis} />

      {/* SSoT: rescue triggers from lifecycle handoffs (partner_rejected + delivery_failed) */}
      {CP_RESCUE_REQUIRED_HANDOFFS.length > 0 && (
        <div className={styles.surfaceCompactPanel} style={{ padding: '10px 16px', direction: 'rtl', textAlign: 'right' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--bthwani-control-panel-text-muted)', marginBottom: '6px' }}>
            محفزات الإنقاذ من lifecycle SSoT
          </div>
          {CP_RESCUE_REQUIRED_HANDOFFS.map((h) => (
            <div key={h.handoffId} style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text)', marginBottom: '2px' }}>
              {`${h.handoffId} — ${h.description}`}
            </div>
          ))}
        </div>
      )}

      <Box gap={2}>
        {cases.map((item) => (
          <RescueCaseRow
            key={item.rescueId}
            item={item}
            isOpen={item.rescueId === openRescueId}
            overriddenActions={overriddenActions}
            onToggle={() =>
              setOpenRescueId((prev) => (prev === item.rescueId ? null : item.rescueId))
            }
            onSelectReason={(reason) =>
              updateCase(item.rescueId, (c) => ({
                ...c,
                issueKind: reason,
                rescueReasonSelector: { ...c.rescueReasonSelector, selectedReason: reason },
              }))
            }
            onSelectOwner={(owner) =>
              updateCase(item.rescueId, (c) => ({
                ...c,
                ownerSelection: { ...c.ownerSelection, selectedOwner: owner },
              }))
            }
            onSelectNextAction={(action) =>
              updateCase(item.rescueId, (c) => ({
                ...c,
                nextActionSelector: { ...c.nextActionSelector, selectedAction: action },
              }))
            }
            onUpdateEvidence={(key, value) =>
              updateCase(item.rescueId, (c) => ({
                ...c,
                requiredEvidence: { ...c.requiredEvidence, [key]: value },
              }))
            }
            onUpdateWlt={(key, value) =>
              updateCase(item.rescueId, (c) => ({
                ...c,
                wltImpactVisibility: { ...c.wltImpactVisibility, [key]: value },
              }))
            }
            onToggleForbidden={(action) => {
              const key = `${item.rescueId}-${action}`;
              setOverriddenActions((prev) => ({ ...prev, [key]: !prev[key] }));
            }}
            onSubmit={() => {
              setSubmitNotes((prev) => ({
                ...prev,
                [item.rescueId]: `تم تأكيد قرار الإنقاذ للطلب ${item.orderId}.`,
              }));
              setTimeout(
                () => setSubmitNotes((prev) => ({ ...prev, [item.rescueId]: null })),
                3500,
              );
            }}
            submitNote={submitNotes[item.rescueId] ?? null}
            onNavigate={(href) => router.push(href)}
          />
        ))}
      </Box>
    </Box>
  );
}

export default OrderRescueScreen;
