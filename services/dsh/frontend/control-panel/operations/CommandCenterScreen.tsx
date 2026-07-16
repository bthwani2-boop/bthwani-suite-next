'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Box, Text } from '@bthwani/ui-kit';
import {
  WebControlPanelRecommendation,
  WebControlPanelDecisionRow,
} from '@bthwani/ui-kit/web';
import { getDshControlPanelGovernanceEntry } from '../../shared/orders/orders.contract';
import { buildOperationsHref, NON_OPERATIONS_SECTION_SHORTCUTS } from '../../shared/operations';
import styles from '../shared/control-panel-surface.module.css';

export type CommandCenterScreenProps = { hubHref: string; subGroup?: string; };

export function CommandCenterScreen({ hubHref, subGroup = 'overview' }: CommandCenterScreenProps) {
  const router = useRouter();

  const operationsGovernance = getDshControlPanelGovernanceEntry('operations');
  const supportGovernance = getDshControlPanelGovernanceEntry('support');
  const financeGovernance = getDshControlPanelGovernanceEntry('finance');

  let content = null;

  if (subGroup === 'overview') {
    content = (
      <div className={styles.surfaceGridTwoCol} style={{ gap: '10px' }}>
        {/* 1. Decision routing map */}
        <div className={styles.surfaceCompactPanel} style={{ padding: '10px' }}>
          <h3 className={styles.surfacePanelTitle} style={{ fontSize: '12px', marginBottom: '8px' }}>خريطة القرار السريع</h3>
          <div className={styles.surfaceStackSmall} style={{ gap: '6px' }}>
            <WebControlPanelDecisionRow
              entityId="OPS"
              entityLabel="التنفيذ التشغيلي الحي"
              status="العمليات"
              statusTone="neutral"
              recommendation="داخل العمليات"
              reason={operationsGovernance.notes}
              sla="إسناد، ضغط، الطلبات الحية"
              primaryAction={{
                id: 'go-live-orders',
                label: 'الطلبات الحية',
                onAction: () => router.push(buildOperationsHref('live-orders')),
              }}
            />
            <WebControlPanelDecisionRow
              entityId="SUP"
              entityLabel="التذاكر والتصعيد"
              status="دعم خارجي"
              statusTone="warning"
              recommendation="حوّل إلى الدعم"
              reason={supportGovernance.notes}
              sla="التذاكر، المحادثات، المتابعة"
              primaryAction={{ id: 'go-support', label: 'فتح الدعم', onAction: () => router.push('/dsh/support') }}
            />
            <WebControlPanelDecisionRow
              entityId="FIN"
              entityLabel="الأثر المالي"
              status="المحفظة المالية"
              statusTone="warning"
              recommendation="حوّل إلى المحفظة المالية WLT — عرض فقط"
              reason={financeGovernance.notes}
              sla="معاينة فقط — لا تعديل مالي"
              primaryAction={{ id: 'go-finance', label: 'فتح المالية', onAction: () => router.push('/dsh/finance') }}
            />
          </div>
        </div>

        {/* 6. WLT finance alerts */}
        <div className={styles.surfaceCompactPanel} style={{ padding: '10px' }}>
          <h3 className={styles.surfacePanelTitle} style={{ fontSize: '12px', marginBottom: '8px' }}>تنبيهات WLT المالية (قراءة فقط)</h3>
          <Box gap={1} paddingX={1} paddingY={1}>
            <Text role="caption" tone="muted">
              لا تعديل مالي أو تسوية داخل DSH؛ المرجعية الكاملة لـ WLT.
            </Text>
          </Box>
          <div className={styles.surfaceStackSmall} style={{ gap: '6px' }}>
            <Text role="caption" tone="muted">لا يوجد مصدر بيانات حي لتنبيهات WLT المالية حالياً.</Text>
          </div>
        </div>
      </div>
    );
  } else if (subGroup === 'anomalies') {
    content = (
      <div className={styles.surfaceGridTwoCol} style={{ gap: '10px' }}>
        <div className={styles.surfaceCompactPanel} style={{ padding: '10px' }}>
          <h3 className={styles.surfacePanelTitle} style={{ fontSize: '12px', marginBottom: '8px' }}>شواذ النظام (Anomalies)</h3>
          <div className={styles.surfaceStackSmall} style={{ gap: '6px' }}>
            <WebControlPanelRecommendation
              title="BLOCKED_NEEDS_RUNTIME_SOURCE"
              reason="لا يوجد مصدر عمليات حي."
              confidence="low"
              auditTag="NEEDS_RUNTIME_EVIDENCE"
            />
          </div>
        </div>
      </div>
    );
  } else if (subGroup === 'recommendations') {
    content = (
      <div className={styles.surfaceGridTwoCol} style={{ gap: '10px' }}>
        <div className={styles.surfaceCompactPanel} style={{ padding: '10px' }}>
          <h3 className={styles.surfacePanelTitle} style={{ fontSize: '12px', marginBottom: '8px' }}>توصيات ذكية</h3>
          <div className={styles.surfaceStackSmall} style={{ gap: '6px' }}>
            <WebControlPanelRecommendation
              title="BLOCKED_NEEDS_RUNTIME_SOURCE"
              reason="لا يوجد مصدر عمليات حي."
              confidence="low"
              auditTag="NEEDS_RUNTIME_EVIDENCE"
            />
          </div>
        </div>
      </div>
    );
  } else {
    content = (
      <div className={styles.surfaceGridTwoCol} style={{ gap: '10px' }}>
        <div className={styles.surfaceCompactPanel} style={{ padding: '10px' }}>
          <h3 className={styles.surfacePanelTitle} style={{ fontSize: '12px', marginBottom: '8px' }}>{subGroup}</h3>
          <div className={styles.surfaceStackSmall} style={{ gap: '6px' }}>
            <WebControlPanelRecommendation
              title="BLOCKED_NEEDS_RUNTIME_SOURCE"
              reason="لا يوجد مصدر عمليات حي."
              confidence="low"
              auditTag="NEEDS_RUNTIME_EVIDENCE"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Box gap={3}>
      {/* ── Header ── */}
      <div className={styles.surfaceSectionHeader} style={{ marginBottom: '4px' }}>
        <h2 className={styles.surfaceSectionTitle} style={{ fontSize: '15px' }}>لوحة التحكم والمراقبة النشطة</h2>
        <p className={styles.surfaceSectionSubtitle} style={{ fontSize: '11px' }}>التدخلات السريعة وتوجيه قرارات الإسناد وحوكمة أسطح DSH</p>
      </div>

      {content}

      {/* ── Governance Footnote Section ── */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid var(--bthwani-control-panel-border)', paddingTop: '10px' }}>
        <div className={styles.surfaceInfoCard} style={{ flex: '1 1 300px', padding: '6px 10px' }}>
          <div>
            <div className={styles.surfaceInfoCardTitle} style={{ fontSize: '11px', fontWeight: 800 }}>حدود ملكية العمليات</div>
            <div className={styles.surfaceInfoCardDescription} style={{ fontSize: '10px' }}>{operationsGovernance.notes}</div>
          </div>
          <div className={styles.surfaceMetaWrap} style={{ gap: '4px' }}>
            {operationsGovernance.onDemandPolicySummary.map((policy) => (
              <span key={policy} className={styles.surfaceMetaChip} style={{ fontSize: '9px', padding: '2px 6px' }}>{policy}</span>
            ))}
          </div>
        </div>

        <div className={styles.surfaceInfoCard} style={{ flex: '1 1 300px', padding: '6px 10px' }}>
          <div>
            <div className={styles.surfaceInfoCardTitle} style={{ fontSize: '11px', fontWeight: 800 }}>تحويلات الملكية والحوكمة</div>
            <div className={styles.surfaceInfoCardDescription} style={{ fontSize: '10px' }}>
              الدعم والماليات والكتالوجات والشركاء والمنصة والإدارة أقسام مستقلة؛ العمليات تفتحها ولا تكرر منطقها.
            </div>
          </div>
          <div className={styles.surfaceMetaWrap} style={{ gap: '4px' }}>
            {NON_OPERATIONS_SECTION_SHORTCUTS.map((shortcut) => (
              <span key={shortcut.id} className={styles.surfaceMetaChip} style={{ fontSize: '9px', padding: '2px 6px' }}>{shortcut.label}</span>
            ))}
          </div>
        </div>
      </div>
    </Box>
  );
}

export default CommandCenterScreen;
