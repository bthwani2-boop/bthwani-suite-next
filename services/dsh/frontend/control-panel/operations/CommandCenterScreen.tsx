'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Box } from '@bthwani/ui-kit';
import {
  WebControlPanelRecommendation,
  WebControlPanelDecisionRow,
} from '@bthwani/ui-kit/web';
import { DSH_NAV_ITEMS } from '@bthwani/control-panel/shell';
import { getDshControlPanelGovernanceEntry } from '../../shared/orders/orders.contract';
import { buildOperationsHref, NON_OPERATIONS_SECTION_SHORTCUTS } from '../../shared/operations';
import { useZonesController } from '../../shared/platform/use-platform-policies-controller';
import { useOperatorAnalyticsDashboardController } from '../../shared/analytics/use-analytics-controller';
import styles from '../shared/control-panel-surface.module.css';

export type CommandCenterScreenProps = { hubHref: string; subGroup?: string };

type Router = ReturnType<typeof useRouter>;

function getDshRoute(section: (typeof DSH_NAV_ITEMS)[number]['section']) {
  return DSH_NAV_ITEMS.find((item) => item.section === section)?.route ?? '/dsh/dashboard';
}

function LiveZonesStatusRow({ router }: { router: Router }) {
  const { state: zonesState, reload } = useZonesController('authenticated');

  if (zonesState.kind === 'idle' || zonesState.kind === 'loading') {
    return (
      <WebControlPanelDecisionRow
        entityId="ZONES-CAPACITY"
        entityLabel="مراقبة الأحمال والمناطق"
        status="جاري التحميل"
        statusTone="neutral"
        recommendation="انتظار الحقيقة التشغيلية"
        reason="يتم جلب بيانات المناطق من DSH"
        sla="—"
      />
    );
  }

  if (zonesState.kind === 'error') {
    return (
      <WebControlPanelDecisionRow
        entityId="ZONES-CAPACITY"
        entityLabel="مراقبة الأحمال والمناطق"
        status="غير متاح"
        statusTone="danger"
        recommendation="إعادة المحاولة"
        reason={zonesState.message}
        sla="—"
        primaryAction={{ id: 'retry-zones', label: 'إعادة التحميل', onAction: reload }}
      />
    );
  }

  const activeCount = zonesState.data.filter((zone) => zone.isActive).length;
  return (
    <WebControlPanelDecisionRow
      entityId="ZONES-CAPACITY"
      entityLabel="مراقبة الأحمال والمناطق"
      status="متصل بالخادم"
      statusTone="success"
      recommendation={`${activeCount} من ${zonesState.data.length} منطقة نشطة`}
      reason="بيانات Runtime مقروءة من المصدر السيادي"
      sla={`آخر جرد: ${zonesState.data.length} منطقة`}
      primaryAction={{
        id: 'go-zones',
        label: 'فتح المناطق والسعة',
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
  const { platformState, orderState, reload } = useOperatorAnalyticsDashboardController('authenticated', 'today');

  const platform = platformState.kind === 'success' ? platformState.kpis : null;
  const orders = orderState.kind === 'success' ? orderState.data : null;
  const analyticsError = platformState.kind === 'error'
    ? platformState.message
    : orderState.kind === 'error'
      ? orderState.message
      : null;
  const analyticsLoading = platformState.kind === 'idle' || platformState.kind === 'loading' || orderState.kind === 'idle' || orderState.kind === 'loading';

  let content: React.ReactNode;

  if (analyticsError) {
    content = (
      <WebControlPanelDecisionRow
        entityId="COMMAND-CENTER-ANALYTICS"
        entityLabel="مؤشرات القيادة التشغيلية"
        status="تعذر التحميل"
        statusTone="danger"
        recommendation="إعادة قراءة المؤشرات"
        reason={analyticsError}
        sla="لا توجد ادعاءات نجاح دون قراءة راجعة"
        primaryAction={{ id: 'retry-command-center', label: 'إعادة المحاولة', onAction: reload }}
      />
    );
  } else if (subGroup === 'overview') {
    content = (
      <div className={styles.surfaceGridTwoCol}>
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
              primaryAction={{ id: 'go-live-orders', label: 'الطلبات الحية', onAction: () => router.push(buildOperationsHref('live-orders')) }}
            />
            <WebControlPanelDecisionRow
              entityId="SUP"
              entityLabel="التذاكر والتصعيد"
              status="الدعم"
              statusTone="warning"
              recommendation="تحويل إلى المالك الصحيح"
              reason={supportGovernance.notes}
              sla="التذاكر، المحادثات، المتابعة"
              primaryAction={{ id: 'go-support', label: 'فتح الدعم', onAction: () => router.push(getDshRoute('support')) }}
            />
            <WebControlPanelDecisionRow
              entityId="FIN"
              entityLabel="الأثر المالي"
              status="WLT"
              statusTone="warning"
              recommendation="عرض من المالك المالي فقط"
              reason={financeGovernance.notes}
              sla="لا تعديل مالي داخل العمليات"
              primaryAction={{ id: 'go-finance', label: 'فتح المالية', onAction: () => router.push(getDshRoute('finance')) }}
            />
          </div>
        </div>

        <div className={styles.surfaceCompactPanel}>
          <h3 className={styles.surfacePanelTitleCompact}>المؤشرات التشغيلية الحية</h3>
          <div className={styles.surfaceStackSmall}>
            <WebControlPanelDecisionRow
              entityId="ORDERS_TOTAL"
              entityLabel="طلبات اليوم"
              status={analyticsLoading ? 'جاري التحميل' : String(orders?.totalOrders ?? 0)}
              statusTone="neutral"
              recommendation="مراقبة التدفق"
              reason="قيمة مقروءة من عقد تحليلات DSH"
              sla={orders?.generatedAt ?? '—'}
            />
            <WebControlPanelDecisionRow
              entityId="OPEN_INCIDENTS"
              entityLabel="الحوادث المفتوحة"
              status={analyticsLoading ? 'جاري التحميل' : String(platform?.openIncidents ?? 0)}
              statusTone={(platform?.openIncidents ?? 0) > 0 ? 'danger' : 'success'}
              recommendation={(platform?.openIncidents ?? 0) > 0 ? 'فتح غرفة التصعيد' : 'لا توجد حوادث مفتوحة'}
              reason="حقيقة تشغيلية من سجل الحوادث"
              sla={platform?.generatedAt ?? '—'}
            />
            <WebControlPanelDecisionRow
              entityId="OPEN_ESCALATIONS"
              entityLabel="التصعيدات المفتوحة"
              status={analyticsLoading ? 'جاري التحميل' : String(platform?.openEscalations ?? 0)}
              statusTone={(platform?.openEscalations ?? 0) > 0 ? 'warning' : 'success'}
              recommendation={(platform?.openEscalations ?? 0) > 0 ? 'مراجعة الاستثناءات' : 'لا توجد تصعيدات مفتوحة'}
              reason="حقيقة تشغيلية من سجل التصعيدات"
              sla={platform?.generatedAt ?? '—'}
              primaryAction={{ id: 'go-exceptions', label: 'فتح الاستثناءات', onAction: () => router.push(buildOperationsHref('exceptions')) }}
            />
          </div>
        </div>
      </div>
    );
  } else if (subGroup === 'anomalies') {
    content = (
      <div className={styles.surfaceCompactPanel}>
        <h3 className={styles.surfacePanelTitleCompact}>الشواذ والتصعيد</h3>
        <div className={styles.surfaceStackSmall}>
          <WebControlPanelDecisionRow
            entityId="ANOMALY-INCIDENTS"
            entityLabel="حوادث مفتوحة"
            status={analyticsLoading ? 'جاري التحميل' : String(platform?.openIncidents ?? 0)}
            statusTone={(platform?.openIncidents ?? 0) > 0 ? 'danger' : 'success'}
            recommendation="مراجعة الحالات من مالكها"
            reason="لا يتم افتراض اتصال أو استقرار دون بيانات Runtime"
            sla={platform?.generatedAt ?? '—'}
          />
        </div>
      </div>
    );
  } else if (subGroup === 'recommendations') {
    content = (
      <div className={styles.surfaceCompactPanel}>
        <h3 className={styles.surfacePanelTitleCompact}>توصيات مبنية على الحقيقة التشغيلية</h3>
        <div className={styles.surfaceStackSmall}>
          <WebControlPanelRecommendation
            title={(platform?.openIncidents ?? 0) > 0 ? 'توجد حوادث تحتاج تدخلًا' : 'لا توجد حوادث مفتوحة'}
            reason={(platform?.openIncidents ?? 0) > 0 ? 'انتقل إلى الاستثناءات والدعم لمعالجة الحوادث المفتوحة.' : 'استمر في مراقبة المؤشرات والقراءة الراجعة.'}
            confidence={analyticsLoading ? 'low' : 'high'}
            auditTag="RUNTIME_ANALYTICS_RECOMMENDATION"
          />
        </div>
      </div>
    );
  } else {
    content = (
      <WebControlPanelRecommendation
        title="لا توجد بيانات معتمدة لهذا القسم"
        reason={`القسم ${subGroup} لا يملك مصدر Runtime معتمدًا داخل مركز القيادة.`}
        confidence="low"
        auditTag="NO_RUNTIME_SOURCE"
      />
    );
  }

  return (
    <Box gap={3}>
      <div className={styles.surfaceSectionHeader}>
        <h2 className={styles.surfaceSectionTitleCompact}>مركز القيادة التشغيلي</h2>
        <p className={styles.surfaceSectionSubtitleCompact}>مؤشرات وقرارات مبنية على قراءة DSH الفعلية دون ادعاءات اتصال ثابتة</p>
      </div>

      <div className={styles.surfaceGridTwoCol}>
        <div className={styles.surfaceCompactPanel}>
          <h3 className={styles.surfacePanelTitleCompact}>السعة المباشرة لمناطق الخدمة</h3>
          <div className={styles.surfaceStackSmall}>
            <LiveZonesStatusRow router={router} />
          </div>
        </div>
      </div>

      {content}

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
              الدعم والمالية والكتالوجات والشركاء والمنصة والإدارة أقسام مستقلة؛ العمليات تفتحها ولا تكرر منطقها.
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
