'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  WebControlPanelKpiStrip,
  WebControlPanelDecisionRow,
} from '@bthwani/ui-kit/web';
import { AWNAK_STAGE_LABELS } from '../../shared/orders';
import { buildOperationsHref } from './operations.registry';
import { Box } from '@bthwani/ui-kit';
import styles from '../shared/control-panel-surface.module.css';
import { DSH_CONTROL_PANEL_TONE_MAP } from '../shared/ControlPanelDshDecisionBoard';
import { fetchOperatorSpecialRequests, type DshSpecialRequestResponse } from '../../shared/special-requests';

export type AwnakScreenProps = {
  hubHref?: string;
  subGroup?: string;
};

const STAGE_ORDER = Object.keys(AWNAK_STAGE_LABELS) as Array<keyof typeof AWNAK_STAGE_LABELS>;

export function AwnakScreen({ hubHref: _hubHref, subGroup }: AwnakScreenProps) {
  const router = useRouter();
  const [requests, setRequests] = React.useState<DshSpecialRequestResponse[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    fetchOperatorSpecialRequests({ requestType: 'AWNAK_ERRAND' })
      .then(res => {
        if (active) {
          setRequests(res.requests ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const summaryKpi = STAGE_ORDER.map((stage) => ({
    id: stage,
    label: AWNAK_STAGE_LABELS[stage],
    value: String(requests.filter(r => r.status === stage).length),
    tone: stage === 'escalated' || stage === 'dispatch_pending' ? ('danger' as const)
      : stage === 'quote_review' || stage === 'proof_review' ? ('neutral' as const)
      : stage === 'completed' ? ('success' as const)
      : ('neutral' as const),
  }));

  const rows = requests.map(r => ({
    requestId: r.id,
    type: r.itemType || 'طلب عونك',
    customer: r.clientId,
    status: r.status,
    statusTone: r.status === 'completed' ? 'success' : r.status === 'cancelled' ? 'danger' : 'warning',
    risk: r.status === 'processing' ? 'متوسط' : 'neutral',
    nextAction: 'مراجعة',
    note: r.customerNotes ?? '',
    owner: r.assignedOperatorId || 'غير مسند',
    sla: r.createdAt,
    captainId: r.dispatchAssignmentId ?? '',
  }));

  return (
    <Box gap={3}>
      <div className={styles.surfaceSectionHeader}>
        <h2 className={styles.surfaceSectionTitle}>عونك — العمليات</h2>
      </div>

      <WebControlPanelKpiStrip items={summaryKpi} />

      {loading ? <p>جاري التحميل...</p> : (
      <Box gap={2} style={{}}>
        {rows.map((item) => (
          <WebControlPanelDecisionRow
            key={item.requestId}
            entityId={item.requestId}
            entityLabel={`${item.type} — ${item.customer}`}
            status={item.status}
            statusTone={DSH_CONTROL_PANEL_TONE_MAP[item.statusTone] ?? 'neutral'}
            risk={item.risk === 'مرتفع' ? 'danger' : item.risk === 'متوسط' ? 'warning' : 'neutral'}
            recommendation={item.nextAction}
            reason={item.note}
            sla={`المالك: ${item.owner} | SLA: ${item.sla}${item.captainId ? ` | الكابتن: ${item.captainId}` : ' | غير مسند'}`}
            primaryAction={{
              id: 'approve',
              label: item.nextAction,
              onAction: () => router.push(buildOperationsHref('awnak-operations', { requestId: item.requestId }))
            }}
            secondaryAction={{
              id: 'details',
              label: 'عرض التفاصيل',
              onAction: () => router.push(buildOperationsHref('awnak-operations', { panel: 'detail', requestId: item.requestId }))
            }}
          />
        ))}
      </Box>
      )}
    </Box>
  );
}

export default AwnakScreen;
