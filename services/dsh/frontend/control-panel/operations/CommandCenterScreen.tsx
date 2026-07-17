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

  const [platformKpis, setPlatformKpis] = React.useState<any>(null);
  const [orderAnalytics, setOrderAnalytics] = React.useState<any>(null);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      import('../../shared/analytics/analytics.api').then(m => m.fetchPlatformKpis()),
      import('../../shared/analytics/analytics.api').then(m => m.fetchOrderAnalytics()),
    ]).then(([kpisRes, ordersRes]) => {
      if (cancelled) return;
      setPlatformKpis(kpisRes);
      setOrderAnalytics(ordersRes);
    }).catch(err => {
      console.error('Failed to fetch analytics:', err);
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

        {/* 2. Live Analytics Summary */}
        <div className={styles.surfaceCompactPanel}>
          <h3 className={styles.surfacePanelTitleCompact}>نظرة عامة على الطلبات والتنفيذ</h3>
          <div className={styles.surfaceStackSmall}>
            <WebControlPanelDecisionRow
              entityId="ORDERS_TOTAL"
              entityLabel="الطلبات الكلية (اليوم)"
              status={orderAnalytics ? String(orderAnalytics.totalOrders) : 'جاري التحميل'}
              statusTone="neutral"
              recommendation="مراقبة مستمرة"
              reason="مؤشر تدفق الطلبات"
              sla="—"
            />
            <WebControlPanelDecisionRow
              entityId="ORDERS_UNASSIGNED"
              entityLabel="مهام غير مسندة"
              status={platformKpis ? String(platformKpis.unassignedTasks) : 'جاري التحميل'}
              statusTone={platformKpis && platformKpis.unassignedTasks > 0 ? 'warning' : 'success'}
              recommendation={platformKpis && platformKpis.unassignedTasks > 0 ? 'يتطلب تدخل فوري للإسناد' : 'الحالة ممتازة'}
              reason="الطلبات الجاهزة بانتظار تعيين كابتن"
              sla="—"
            />
            <WebControlPanelDecisionRow
              entityId="WLT_FAILURES"
              entityLabel="إخفاقات تسليم WLT (Outbox)"
              status={platformKpis ? String(platformKpis.wltHandoffFailures) : 'جاري التحميل'}
              statusTone={platformKpis && platformKpis.wltHandoffFailures > 0 ? 'danger' : 'success'}
              recommendation={platformKpis && platformKpis.wltHandoffFailures > 0 ? 'تحويل للمالية - اختناق بالشبكة أو عطل' : 'لا توجد تعثرات'}
              reason="أحداث لم يتم تسليمها لمحفظة WLT بعد المزامنة"
              sla="—"
            />
          </div>
        </div>
      </div>
    );
  } else if (subGroup === 'anomalies') {
    content = (
      <div className={styles.surfaceGridTwoCol}>
        <div className={styles.surfaceCompactPanel}>
          <h3 className={styles.surfacePanelTitleCompact}>شواذ النظام والتصعيد (Anomalies)</h3>
          <div className={styles.surfaceStackSmall}>
            <WebControlPanelDecisionRow
              entityId="OPEN_INCIDENTS"
              entityLabel="حوادث مفتوحة"
              status={platformKpis ? String(platformKpis.openIncidents) : 'جاري التحميل'}
              statusTone={platformKpis && platformKpis.openIncidents > 0 ? 'danger' : 'success'}
              recommendation="مراجعة الحوادث التشغيلية المفتوحة"
              reason="أعطال أو مشاكل تقنية حية"
              sla="—"
            />
            <WebControlPanelDecisionRow
              entityId="OPEN_ESCALATIONS"
              entityLabel="تصعيدات معلقة"
              status={platformKpis ? String(platformKpis.openEscalations) : 'جاري التحميل'}
              statusTone={platformKpis && platformKpis.openEscalations > 0 ? 'warning' : 'success'}
              recommendation="تتطلب متابعة مع المشرف"
              reason="حالات تجاوزت السقف المسموح للانتظار"
              sla="—"
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
            {platformKpis && platformKpis.unassignedTasks > 0 ? (
              <WebControlPanelRecommendation
                title="توجيه أسطول سريع"
                reason="يوجد مهام غير مسندة، يوصى بتحريك كباتن أو تفعيل حافز Surge لتلبية الطلب."
                confidence="high"
                auditTag="CAPACITY_REDISTRIBUTION"
              />
            ) : (
              <WebControlPanelRecommendation
                title="استقرار تشغيلي"
                reason="جميع الطلبات مسندة أو قيد المعالجة بنجاح."
                confidence="high"
                auditTag="SYSTEM_STABLE"
              />
            )}
            {platformKpis && platformKpis.wltHandoffFailures > 0 && (
              <WebControlPanelRecommendation
                title="أخطاء المزامنة مع WLT"
                reason="أحداث تسليم مالية متأخرة أو معلقة، قم بإخطار فريق الهندسة فوراً."
                confidence="high"
                auditTag="FINANCE_HANDOFF_ALERT"
              />
            )}
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
              title="لا توجد بيانات إضافية"
              reason={`لا توجد إحصائيات معتمدة لقسم ${subGroup} حالياً.`}
              confidence="low"
              auditTag="NO_DATA"
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
