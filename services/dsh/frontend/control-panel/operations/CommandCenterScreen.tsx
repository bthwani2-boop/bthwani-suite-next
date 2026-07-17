'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Box, Text } from '@bthwani/ui-kit';
import {
  WebControlPanelRecommendation,
  WebControlPanelDecisionRow,
} from '@bthwani/ui-kit/web';
import { DSH_NAV_ITEMS } from '@bthwani/control-panel/shell';
import { getDshControlPanelGovernanceEntry } from '../../shared/orders/orders.contract';
import { buildOperationsHref, NON_OPERATIONS_SECTION_SHORTCUTS } from '../../shared/operations';
import styles from '../shared/control-panel-surface.module.css';

export type CommandCenterScreenProps = { hubHref: string; subGroup?: string; };

function getDshRoute(section: (typeof DSH_NAV_ITEMS)[number]['section']) {
  return DSH_NAV_ITEMS.find((item) => item.section === section)?.route ?? '/dsh/dashboard';
}

export function CommandCenterScreen({ subGroup = 'overview' }: CommandCenterScreenProps) {
  const router = useRouter();

  const operationsGovernance = getDshControlPanelGovernanceEntry('operations');
  const supportGovernance = getDshControlPanelGovernanceEntry('support');
  const financeGovernance = getDshControlPanelGovernanceEntry('finance');

  let content = null;

  if (subGroup === 'overview') {
    content = (
      <div className={styles.surfaceGridTwoCol}>
        {/* 1. Decision routing map */}
        <div className={styles.surfaceCompactPanel}>
          <h3 className={styles.surfacePanelTitleCompact}>خريطة القرار السريع</h3>
          <div className={styles.surfaceStackSmall}>
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
              primaryAction={{ id: 'go-support', label: 'فتح الدعم', onAction: () => router.push(getDshRoute('support')) }}
            />
            <WebControlPanelDecisionRow
              entityId="FIN"
              entityLabel="الأثر المالي"
              status="المحفظة المالية"
              statusTone="warning"
              recommendation="حوّل إلى المحفظة المالية WLT — عرض فقط"
              reason={financeGovernance.notes}
              sla="معاينة فقط — لا تعديل مالي"
              primaryAction={{ id: 'go-finance', label: 'فتح المالية', onAction: () => router.push(getDshRoute('finance')) }}
            />
          </div>
        </div>

        {/* 6. WLT finance alerts */}
        <div className={styles.surfaceCompactPanel}>
          <h3 className={styles.surfacePanelTitleCompact}>تنبيهات WLT المالية (قراءة فقط)</h3>
          <Box gap={1} paddingX={1} paddingY={1}>
            <Text role="caption" tone="muted">
              لا تعديل مالي أو تسوية داخل DSH؛ المرجعية الكاملة لـ WLT.
            </Text>
          </Box>
          <div className={styles.surfaceStackSmall}>
            <Text role="caption" tone="muted">لا يوجد مصدر بيانات حي لتنبيهات WLT المالية حالياً.</Text>
          </div>
        </div>
      </div>
    );
  } else if (subGroup === 'anomalies') {
    content = (
      <div className={styles.surfaceGridTwoCol}>
        <div className={styles.surfaceCompactPanel}>
          <h3 className={styles.surfacePanelTitleCompact}>شواذ النظام (Anomalies)</h3>
          <div className={styles.surfaceStackSmall}>
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
      <div className={styles.surfaceGridTwoCol}>
        <div className={styles.surfaceCompactPanel}>
          <h3 className={styles.surfacePanelTitleCompact}>توصيات ذكية</h3>
          <div className={styles.surfaceStackSmall}>
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
      <div className={styles.surfaceGridTwoCol}>
        <div className={styles.surfaceCompactPanel}>
          <h3 className={styles.surfacePanelTitleCompact}>{subGroup}</h3>
          <div className={styles.surfaceStackSmall}>
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
      <div className={styles.surfaceSectionHeader}>
        <h2 className={styles.surfaceSectionTitleCompact}>لوحة التحكم والمراقبة النشطة</h2>
        <p className={styles.surfaceSectionSubtitleCompact}>التدخلات السريعة وتوجيه قرارات الإسناد وحوكمة أسطح DSH</p>
      </div>

      <div className={styles.surfaceGridTwoCol}>
        <div className={styles.surfaceCompactPanel}>
          <h3 className={styles.surfacePanelTitleCompact}>السعة المباشرة لمناطق الخدمة (Live Capacity)</h3>
          <div className={styles.surfaceStackSmall}>
            <WebControlPanelDecisionRow
              entityId="ZONES-CAPACITY"
              entityLabel="مراقبة الأحمال والمناطق"
              status="غير متصل بالخادم"
              statusTone="neutral"
              recommendation="البيانات الحية غير متوفرة"
              reason="الرجاء التأكد من اتصال خادم الـ Runtime"
              sla="لا يوجد بيانات"
              primaryAction={{
                id: 'go-zones',
                label: 'عرض فلاتر المناطق (Zone Filters)',
                onAction: () => router.push(buildOperationsHref('dispatch-capacity', { subGroup: 'zones' })),
              }}
            />
          </div>
        </div>
      </div>

      {content}

      {/* ── Governance Footnote Section ── */}
      <div className={styles.surfaceFootnoteGrid}>
        <div className={styles.surfaceFootnoteCard}>
          <div>
            <div className={styles.surfaceInfoCardTitleCompact}>حدود ملكية العمليات</div>
            <div className={styles.surfaceInfoCardDescriptionCompact}>{operationsGovernance.notes}</div>
          </div>
          <div className={styles.surfaceMetaWrapCompact}>
            {operationsGovernance.onDemandPolicySummary.map((policy) => (
              <span key={policy} className={styles.surfaceMetaChipCompact}>{policy}</span>
            ))}
          </div>
        </div>

        <div className={styles.surfaceFootnoteCard}>
          <div>
            <div className={styles.surfaceInfoCardTitleCompact}>تحويلات الملكية والحوكمة</div>
            <div className={styles.surfaceInfoCardDescriptionCompact}>
              الدعم والماليات والكتالوجات والشركاء والمنصة والإدارة أقسام مستقلة؛ العمليات تفتحها ولا تكرر منطقها.
            </div>
          </div>
          <div className={styles.surfaceMetaWrapCompact}>
            {NON_OPERATIONS_SECTION_SHORTCUTS.map((shortcut) => (
              <button
                key={shortcut.id}
                type="button"
                className={`${styles.surfaceMetaChipCompact} ${styles.surfaceMetaChipButton}`}
                onClick={() => router.push(shortcut.href)}
              >
                {shortcut.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Box>
  );
}

export default CommandCenterScreen;
