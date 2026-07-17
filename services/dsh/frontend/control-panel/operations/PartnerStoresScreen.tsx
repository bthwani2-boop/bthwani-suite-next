'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Button, StateView, Text } from '@bthwani/ui-kit';
import {
  WebControlPanelDecisionRow,
  WebControlPanelInspectorShell,
  WebControlPanelKpiStrip,
  WebControlPanelRecommendation,
} from '@bthwani/ui-kit/web';
import { useControlPanelSession } from '../../shared/session/control-panel-session';
import { buildOperationsHref } from './operations.registry';
import { useStoreAdminController, type DshStoreAdminTableRow } from '../../shared/store';
import styles from '../shared/control-panel-surface.module.css';

export type PartnerStoresScreenProps = {
  hubHref: string;
  subGroup?: string;
  focusParams?: { orderId?: string | undefined } | undefined;
};

type CpStoreRow = {
  id: string;
  name: string;
  branch: string;
  status: string;
  deliveryMode: 'bthwani_delivery' | 'partner_delivery';
  issue: string;
  recommendation: string;
  recommendationReason: string;
  statusTone: 'success' | 'warning' | 'danger' | 'neutral';
};

function mapAdminRowToCpRow(row: DshStoreAdminTableRow): CpStoreRow {
  const isOpenNow = row.isOpen && row.status === 'active';
  return {
    id: row.id,
    name: row.displayName,
    branch: row.cityCode,
    status: isOpenNow ? 'مفتوح' : row.status === 'temporarily_closed' ? 'موقوف مؤقتًا' : 'مغلق',
    deliveryMode: row.deliveryModes.includes('delivery') ? 'bthwani_delivery' : 'partner_delivery',
    issue: row.isServiceable ? '' : 'خارج نطاق الخدمة الحالي',
    recommendation: row.catalogApprovalStatus === 'submitted'
      ? 'مراجعة الكتالوج لدى المالك المختص'
      : 'مراجعة بوابات الظهور لدى المالك المختص',
    recommendationReason: `${row.categoryLabel} — كتالوج: ${row.catalogApprovalStatus} — تسويق: ${row.marketingVisibility}`,
    statusTone: isOpenNow ? 'success' : row.status === 'temporarily_closed' ? 'danger' : 'neutral',
  };
}

export function PartnerStoresScreen({ focusParams }: PartnerStoresScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlStoreId = focusParams?.orderId ?? searchParams.get('orderId') ?? null;
  const { state: identity } = useControlPanelSession();
  const controller = useStoreAdminController(identity.kind);

  const rows = React.useMemo(
    () => controller.visibleRows.map(mapAdminRowToCpRow),
    [controller.visibleRows],
  );

  React.useEffect(() => {
    if (urlStoreId && rows.some((store) => store.id === urlStoreId)) {
      controller.selectStore(urlStoreId);
    }
  }, [controller, rows, urlStoreId]);

  const activeStore = rows.find((store) => store.id === controller.selectedStoreId) ?? null;
  const activeDetail = controller.detailState?.kind === 'success'
    ? controller.detailState.detail
    : null;
  const isSubmitting = controller.actionState.kind === 'submitting';

  const closeInspector = React.useCallback(() => {
    controller.selectStore(null);
    router.push(buildOperationsHref('partner-stores'));
  }, [controller, router]);

  const updateLifecycle = React.useCallback(
    (value: 'active' | 'temporarily_closed', reason: string) => {
      if (!controller.selectedStoreId || !activeDetail) return;
      void controller.govern(controller.selectedStoreId, {
        expectedVersion: activeDetail.version,
        action: 'lifecycle',
        value,
        reason,
      });
    },
    [activeDetail, controller],
  );

  if (identity.kind !== 'authenticated') {
    return (
      <StateView
        stateId="recoverableError"
        title="يتطلب تسجيل دخول مشغّل"
        description="سجّل الدخول بحساب مخول لقراءة جاهزية المتاجر."
      />
    );
  }

  if (controller.isNonSuccess) {
    return (
      <StateView
        stateId="recoverableError"
        title="تعذر تحميل بيانات المتاجر"
        description="لم تتمكن لوحة العمليات من قراءة المتاجر من DSH Runtime."
        actionLabel="إعادة المحاولة"
        onActionPress={() => void controller.reload()}
      />
    );
  }

  return (
    <Box gap={3}>
      <div className={styles.surfaceSectionHeader}>
        <h2 className={styles.surfaceSectionTitle}>المتاجر والشركاء</h2>
        <Text role="caption" tone="success">مصدر حي — DSH Runtime</Text>
      </div>

      <WebControlPanelKpiStrip
        items={[
          { id: 'open', label: 'مفتوحة الآن', value: String(rows.filter((row) => row.status === 'مفتوح').length), tone: 'success' },
          { id: 'closed', label: 'مغلقة', value: String(rows.filter((row) => row.status === 'مغلق').length), tone: 'neutral' },
          { id: 'suspended', label: 'موقوفة مؤقتًا', value: String(rows.filter((row) => row.status === 'موقوف مؤقتًا').length), tone: 'danger' },
          { id: 'total', label: 'إجمالي المتاجر', value: String(controller.total), tone: 'neutral' },
        ]}
      />

      <div className={styles.surfaceInnerLayout}>
        <Box gap={2}>
          {rows.length === 0 ? (
            <StateView
              stateId="empty"
              title="لا توجد متاجر"
              description="لم يرجع DSH Runtime أي متجر ضمن النطاق الحالي."
            />
          ) : rows.map((store) => (
            <WebControlPanelDecisionRow
              key={store.id}
              entityId={store.id}
              entityLabel={`${store.name} — ${store.branch}`}
              status={store.status}
              statusTone={store.statusTone}
              risk={store.statusTone === 'danger' ? 'danger' : store.statusTone === 'warning' ? 'warning' : 'neutral'}
              recommendation={store.recommendation}
              reason={store.recommendationReason}
              sla={store.issue || (store.deliveryMode === 'partner_delivery' ? 'توصيل المتجر' : 'توصيل بثواني')}
              onInspect={() => {
                controller.selectStore(store.id);
                router.push(buildOperationsHref('partner-stores', { orderId: store.id }));
              }}
              primaryAction={{
                id: `${store.id}-details`,
                label: 'عرض الجاهزية',
                onAction: () => {
                  controller.selectStore(store.id);
                  router.push(buildOperationsHref('partner-stores', { orderId: store.id }));
                },
              }}
            />
          ))}
        </Box>

        <Box gap={4}>
          {activeStore ? (
            <WebControlPanelInspectorShell
              title={`الجاهزية التشغيلية — ${activeStore.name}`}
              onClose={closeInspector}
            >
              <Box gap={4} padding={4}>
                <Box gap={1}>
                  <Text role="titleSm">{activeStore.name}</Text>
                  <Text role="bodySm" tone="muted">الفرع: {activeStore.branch}</Text>
                  <Text role="bodySm">الحالة: {activeStore.status}</Text>
                  <Text role="bodySm">
                    نمط التوصيل: {activeStore.deliveryMode === 'partner_delivery' ? 'توصيل المتجر' : 'توصيل بثواني'}
                  </Text>
                  {activeStore.issue ? <Text role="bodySm" tone="danger">{activeStore.issue}</Text> : null}
                </Box>

                <Box gap={2}>
                  <Text role="bodyStrong">حدود الملكية</Text>
                  <Text role="bodySm" tone="muted">
                    العمليات تراقب الجاهزية وتوقف استقبال الطلبات أو تستأنفه فقط. اعتماد الكتالوج والظهور التسويقي ينفذان داخل القسم المالك لكل منهما.
                  </Text>
                  <Box layoutDirection="row" gap={2}>
                    <Button
                      label="فتح الكتالوجات"
                      tone="secondary"
                      onPress={() => router.push(`/dsh/catalogs?storeId=${activeStore.id}`)}
                    />
                    <Button
                      label="فتح ملف الشريك"
                      tone="secondary"
                      onPress={() => router.push(`/dsh/partners?storeId=${activeStore.id}`)}
                    />
                  </Box>
                </Box>

                {controller.actionState.kind === 'error' || controller.actionState.kind === 'conflict' ? (
                  <Text role="bodySm" tone="danger">{controller.actionState.message}</Text>
                ) : null}
                {controller.actionState.kind === 'success' ? (
                  <Text role="bodySm" tone="success">تم تطبيق الإجراء التشغيلي وإعادة قراءة حالة المتجر.</Text>
                ) : null}

                <Box gap={2}>
                  {activeStore.status === 'موقوف مؤقتًا' ? (
                    <Button
                      label={isSubmitting ? 'جاري الاستئناف...' : 'استئناف استقبال الطلبات'}
                      disabled={isSubmitting || !activeDetail}
                      onPress={() => updateLifecycle('active', 'استئناف استقبال الطلبات من لوحة العمليات')}
                    />
                  ) : (
                    <Button
                      label={isSubmitting ? 'جاري الإيقاف...' : 'إيقاف استقبال الطلبات مؤقتًا'}
                      tone="danger"
                      disabled={isSubmitting || !activeDetail}
                      onPress={() => updateLifecycle('temporarily_closed', 'إيقاف مؤقت لاستقبال الطلبات من لوحة العمليات')}
                    />
                  )}
                </Box>
              </Box>
            </WebControlPanelInspectorShell>
          ) : (
            <WebControlPanelRecommendation
              title="تفاصيل الجاهزية والتحكم"
              reason="اختر متجرًا لعرض الحقيقة التشغيلية. قرارات الكتالوج والتسويق تبقى في أقسامها المالكة."
              confidence="high"
              auditTag="PARTNER_STORES_MONITOR"
            />
          )}
        </Box>
      </div>
    </Box>
  );
}

export default PartnerStoresScreen;
