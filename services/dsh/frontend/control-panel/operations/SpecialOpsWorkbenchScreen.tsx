import React from 'react';
import { useRouter } from 'next/navigation';
import {
  WebControlPanelKpiStrip,
  WebControlPanelDecisionRow,
  WebControlPanelQueue,
} from '@bthwani/ui-kit/web';
import { Box, Text } from '@bthwani/ui-kit';
import styles from '../shared/control-panel-surface.module.css';
import { buildOperationsHref } from '../../shared/operations';
import { useOperatorSpecialRequestsController } from '../../shared/special-requests/use-special-requests-controller';
import { opsTheme as theme } from '../../shared/operations/theme';

export type SpecialOpsWorkbenchScreenProps = {
  state?: 'ready' | 'loading' | 'error' | 'empty';
  subGroup?: string;
  onRetry?: () => void;
};

export function SpecialOpsWorkbenchScreen({ state = 'ready', subGroup, onRetry }: SpecialOpsWorkbenchScreenProps) {
  const router = useRouter();
  const provider = subGroup === 'shein' ? 'SHEIN_ASSISTED_PURCHASE' : subGroup === 'awnak' ? 'AWNAK_ERRAND' : undefined;
  const { requests, total, loadState, reload } = useOperatorSpecialRequestsController({
    requestType: provider,
    limit: 100,
    autoLoad: true,
  });

  const retry = React.useCallback(() => reload(), [reload]);

  if (state === 'loading') {
    return (
      <div className={styles.surfaceInnerScroll} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <p style={{ color: theme.textMuted, fontSize: '13px' }}>جارٍ تحميل العمليات الخاصة...</p>
      </div>
    );
  }

  if (state === 'error' || loadState === 'error') {
    return (
      <div className={styles.surfaceInnerScroll} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <div style={{ textAlign: 'center', border: `1px solid ${theme.danger}`, padding: '24px', borderRadius: '10px', background: theme.dangerSurface }}>
          <p style={{ color: theme.dangerText, fontSize: '13px', marginBottom: '12px' }}>تعذر الاتصال بخادم الطلبات الخاصة.</p>
          <button type="button" onClick={onRetry ?? retry} aria-label="إعادة محاولة" style={{ padding: '6px 18px', background: theme.danger, color: theme.textInverse, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}>إعادة المحاولة</button>
        </div>
      </div>
    );
  }

  const activeCount = requests.filter(r => r.status !== 'completed' && r.status !== 'cancelled').length;
  const isLoaded = loadState !== 'loading';

  const summaryKpi = [
    { id: 'active', label: 'الطلبات النشطة', value: isLoaded ? String(activeCount) : '—', tone: 'warning' as const },
    { id: 'total', label: 'إجمالي الطلبات', value: isLoaded ? String(total) : '—', tone: 'neutral' as const },
    { id: 'source', label: 'مصدر البيانات', value: isLoaded ? 'Runtime' : 'جاري التحميل', tone: isLoaded ? ('success' as const) : ('neutral' as const) },
  ];

  return (
    <Box gap={3}>
      <WebControlPanelKpiStrip items={summaryKpi} />

      <div className={styles.surfaceSplitGrid}>
        <Box gap={3}>
          <WebControlPanelQueue
            title={`طلبات ${subGroup === 'shein' ? 'شي إن' : 'عونك'}`}
            meta={isLoaded ? `${total} طلب` : 'جاري التحميل...'}
          >
            {isLoaded ? (
              requests.map((req) => (
                <WebControlPanelDecisionRow
                  key={req.id}
                  entityId={req.id}
                  entityLabel={`العميل: ${req.clientId}`}
                  status={req.status}
                  statusTone={req.status === 'pending' ? 'warning' : req.status === 'completed' ? 'success' : 'neutral'}
                  sla={`تاريخ الإنشاء: ${new Date(req.createdAt).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`}
                  onInspect={() => router.push(buildOperationsHref('special-ops', { requestId: req.id, subGroup }))}
                />
              ))
            ) : null}
            {isLoaded && requests.length === 0 && (
              <div style={{ padding: '16px', textAlign: 'center' }}>
                <Text role="bodySm" tone="muted">لا توجد طلبات خاصة حالياً.</Text>
              </div>
            )}
          </WebControlPanelQueue>
        </Box>
      </div>
    </Box>
  );
}

export default SpecialOpsWorkbenchScreen;
