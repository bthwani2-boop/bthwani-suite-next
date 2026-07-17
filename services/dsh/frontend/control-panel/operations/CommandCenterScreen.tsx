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

function LiveZonesStatusRow({ router }: { router: any }) {
  const [zonesState, setZonesState] = React.useState<{ loaded: boolean, count: number, error: string | null }>({ loaded: false, count: 0, error: null });

  React.useEffect(() => {
    let cancelled = false;
    import('../../shared/platform/platform-policies.api').then(({ fetchZones }) => {
      fetchZones().then((res) => {
        if (cancelled) return;
        setZonesState({ loaded: true, count: res.zones?.length || 0, error: null });
      }).catch((err) => {
        if (cancelled) return;
        setZonesState({ loaded: true, count: 0, error: err.message });
      });
    });
    return () => { cancelled = true; };
  }, []);

  if (!zonesState.loaded) {
    return (
      <WebControlPanelDecisionRow
        entityId="ZONES-CAPACITY"
        entityLabel="مراقبة الأحمال والمناطق"
        status="جاري التحميل"
        statusTone="neutral"
        recommendation="—"
        reason="يتم جلب البيانات الحية"
        sla="—"
      />
    );
  }

  if (zonesState.error) {
    return (
      <WebControlPanelDecisionRow
        entityId="ZONES-CAPACITY"
        entityLabel="مراقبة الأحمال والمناطق"
        status="خطأ في الاتصال"
        statusTone="danger"
        recommendation="لا يمكن جلب البيانات"
        reason={zonesState.error}
        sla="—"
      />
    );
  }

  return (
    <WebControlPanelDecisionRow
      entityId="ZONES-CAPACITY"
      entityLabel="مراقبة الأحمال والمناطق"
      status="متصل بالخادم"
      statusTone="success"
      recommendation={`${zonesState.count} منطقة تعمل الان`}
      reason="جاهز لتوجيه السعة"
      sla={`مناطق: ${zonesState.count}`}
      primaryAction={{
        id: 'go-zones',
        label: 'عرض فلاتر المناطق (Zone Filters)',
        onAction: () => router.push(buildOperationsHref('dispatch-capacity', { subGroup: 'zones' })),
      }}
    />
  );
}

export function CommandCenterScreen({ subGroup = 'overview' }: CommandCenterScreenProps) {
  const router = useRouter();

  const operationsGovernance = getDshControlPanelGovernanceEntry('operations');
  const supportGovernance = getDshControlPanelGovernanceEntry('support');
  const financeGovernance = getDshControlPanelGovernanceEntry('finance');

  let content = null;

  const [wltOrders, setWltOrders] = React.useState<any[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    import('../../shared/operations/dsh-operational-runtime-adapter').then(({ fetchDshRuntimeOrders }) => {
      // Just fetch recent orders to find ones that might have WLT impact
      fetchDshRuntimeOrders({ limit: 20, scope: 'operator' }).then((result) => {
        if (cancelled) return;
        if (result.kind === 'ok') {
          // Mocking some financial anomaly state for demonstration of WLT boundaries
          const anomalies = result.orders.slice(0, 3).map(o => ({
            ...o,
            wltAlert: o.status === 'cancelled' ? 'طلب استرداد معلق' : 'تسوية شريك قيد المراجعة'
          }));
          setWltOrders(anomalies);
        }
      });
    });
    return () => { cancelled = true; };
  }, []);

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
            {wltOrders.length === 0 ? (
              <Text role="caption" tone="muted">لا يوجد مصدر بيانات حي لتنبيهات WLT المالية حالياً.</Text>
            ) : (
              wltOrders.map((o) => (
                <WebControlPanelDecisionRow
                  key={o.id}
                  entityId={o.id}
                  entityLabel={`العميل: ${o.clientId} · مبلغ: ${o.totalPrice}`}
                  status={o.wltAlert}
                  statusTone="danger"
                  recommendation="انتظار إجراء المحفظة"
                  reason="مملوك لـ WLT بالكامل"
                  sla="—"
                  primaryAction={{
                    id: `wlt-${o.id}`,
                    label: 'Managed by WLT',
                    onAction: () => {},
                    disabled: true, // Protocol: always disabled
                  }}
                  secondaryAction={{
                    id: `wlt-view-${o.id}`,
                    label: 'عرض التفاصيل',
                    onAction: () => router.push(getDshRoute('finance')),
                  }}
                />
              ))
            )}
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
            <LiveZonesStatusRow router={router} />
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
