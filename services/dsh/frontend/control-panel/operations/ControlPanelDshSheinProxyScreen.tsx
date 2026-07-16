'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  WebControlPanelKpiStrip,
  WebControlPanelDecisionRow,
} from '@bthwani/ui-kit/web';
import { SHEIN_PROXY_STAGE_LABELS } from '../../shared/orders';
import { buildOperationsHref } from './operations.registry';
import { Box } from '@bthwani/ui-kit';
import styles from '../shared/control-panel-surface.module.css';
import { DSH_CONTROL_PANEL_TONE_MAP } from '../shared/ControlPanelDshDecisionBoard';
import { fetchOperatorSpecialRequests, type SpecialRequestRow } from '../../shared/operations/dsh-special-requests-adapter';

export type ControlPanelDshSheinProxyScreenProps = {
  hubHref?: string;
  subGroup?: string;
};

const STAGE_ORDER = Object.keys(SHEIN_PROXY_STAGE_LABELS) as Array<keyof typeof SHEIN_PROXY_STAGE_LABELS>;

export function ControlPanelDshSheinProxyScreen({ hubHref: _hubHref, subGroup }: ControlPanelDshSheinProxyScreenProps) {
  const router = useRouter();
  const [data, setData] = React.useState<SpecialRequestRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    fetchOperatorSpecialRequests({ requestType: 'shein' }).then(res => {
      if (active) {
        if (res.kind === 'ok') setData(res.requests);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  const summaryKpi = STAGE_ORDER.map((stage) => ({
    id: stage,
    label: SHEIN_PROXY_STAGE_LABELS[stage],
    value: String(data.filter(r => r.status === stage).length),
    tone: stage === 'exception' ? ('danger' as const)
      : stage === 'intake_review' || stage === 'quote_pending' || stage === 'customer_approval' ? ('neutral' as const)
      : stage === 'delivered' ? ('success' as const)
      : ('neutral' as const),
  }));

  const requests = data.map(r => ({
    id: r.id,
    customer: r.clientId,
    statusLabel: r.status,
    statusTone: r.status === 'completed' ? 'success' : r.status === 'cancelled' ? 'danger' : 'warning',
    nextStep: 'مراجعة',
    note: r.customerNotes,
    owner: r.assignedOperatorId || 'غير مسند',
    sla: r.createdAt,
    total: r.estimatedAmountReference ? `${r.estimatedAmountReference} ${r.currency}` : '—',
  }));

  return (
    <Box gap={3}>
      <div className={styles.surfaceSectionHeader}>
        <h2 className={styles.surfaceSectionTitle}>شي إن — عمليات الوكالة</h2>
      </div>

      <WebControlPanelKpiStrip items={summaryKpi} />

      {loading ? <p>جاري التحميل...</p> : (
      <Box gap={2} style={{}}>
        {requests.map((request) => (
          <WebControlPanelDecisionRow
            key={request.id}
            entityId={request.id}
            entityLabel={request.customer}
            status={request.statusLabel}
            statusTone={DSH_CONTROL_PANEL_TONE_MAP[request.statusTone] ?? 'neutral'}
            risk={request.statusTone === 'danger' ? 'danger' : request.statusTone === 'warning' ? 'warning' : 'neutral'}
            recommendation={request.nextStep}
            reason={request.note}
            sla={`المالك: ${request.owner} | SLA: ${request.sla} | الإجمالي: ${request.total}`}
            primaryAction={{
              id: 'inspect',
              label: request.nextStep,
              onAction: () => router.push(buildOperationsHref('sheinproxy', { requestId: request.id }))
            }}
            secondaryAction={{
              id: 'batches',
              label: 'إدارة الدُفعة',
              onAction: () => router.push(buildOperationsHref('sheinproxy', { panel: 'batches', requestId: request.id }))
            }}
          />
        ))}
      </Box>
      )}
    </Box>
  );
}

export default ControlPanelDshSheinProxyScreen;
