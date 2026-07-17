'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  WebControlPanelDecisionRow,
  WebControlPanelKpiStrip,
  WebControlPanelInspectorShell,
  WebControlPanelRecommendation,
} from '@bthwani/ui-kit/web';
import { Box } from '@bthwani/ui-kit';
import { useControlPanelSession } from '../../shared/session/control-panel-session';
import styles from '../shared/control-panel-surface.module.css';
import { buildOperationsHref } from './operations.registry';
import { useStoreAdminController, type DshStoreAdminTableRow } from '../../shared/store';

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
  prepTime: string;
  readyOrders: number;
  issue: string;
  suggestion: {
    label: string;
    reason: string;
    confidence: 'high' | 'medium' | 'low';
    action: string;
    secondary: string | null;
    auditRequired: boolean;
  };
  statusTone: 'success' | 'warning' | 'danger' | 'neutral';
};

function mapAdminRowToCpRow(row: DshStoreAdminTableRow): CpStoreRow {
  const isOpenNow = row.isOpen && row.status === 'active';
  return {
    id: row.id,
    name: row.displayName,
    branch: row.cityCode,
    status: isOpenNow ? 'مفتوح' : row.status === 'temporarily_closed' ? 'موقف مؤقتاً' : 'مغلق',
    deliveryMode: row.deliveryModes.includes('delivery') ? 'bthwani_delivery' : 'partner_delivery',
    prepTime: '—',
    readyOrders: 0,
    issue: row.isServiceable ? '' : 'خارج نطاق الخدمة الحالي',
    suggestion: {
      label: row.catalogApprovalStatus === 'submitted' ? 'راجع اعتماد الكتالوج' : 'راجع بوابات الرؤية',
      reason: `${row.categoryLabel} — كتالوج: ${row.catalogApprovalStatus} — تسويق: ${row.marketingVisibility}`,
      confidence: 'high',
      action: 'عرض التفاصيل',
      secondary: null,
      auditRequired: row.catalogApprovalStatus === 'submitted',
    },
    statusTone: isOpenNow ? 'success' : row.status === 'temporarily_closed' ? 'danger' : 'neutral',
  };
}

export function PartnerStoresScreen({ hubHref: _hubHref, subGroup: _subGroup, focusParams }: PartnerStoresScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlStoreId = focusParams?.orderId ?? searchParams.get('orderId') ?? null;
  const { state: identity } = useControlPanelSession();
  const c = useStoreAdminController(identity.kind);

  const rows = React.useMemo(() => c.visibleRows.map(mapAdminRowToCpRow), [c.visibleRows]);

  React.useEffect(() => {
    if (urlStoreId && rows.some((s) => s.id === urlStoreId)) {
      c.selectStore(urlStoreId);
    }
  }, [urlStoreId, rows]);

  const activeStore = rows.find((s) => s.id === c.selectedStoreId);
  const activeDetail = c.detailState?.kind === 'success' ? c.detailState.detail : null;

  const handleGovern = React.useCallback(
    (action: 'lifecycle' | 'catalog-approval' | 'marketing-visibility', value: string, reason: string) => {
      if (!c.selectedStoreId || !activeDetail) return;
      void c.govern(c.selectedStoreId, {
        expectedVersion: activeDetail.version,
        action,
        value,
        reason,
      });
    },
    [c, activeDetail],
  );

  // Inspector component
  let inspectorContent: React.ReactNode = null;
  if (c.selectedStoreId && activeStore) {
    const isSuspended = activeStore.status === 'موقف مؤقتاً';
    const isSubmitting = c.actionState.kind === 'submitting';

    inspectorContent = (
      <WebControlPanelInspectorShell
        title={`مراجعة حالة المتجر — ${activeStore.name}`}
        onClose={() => {
          c.selectStore(null);
          router.push(buildOperationsHref('partner-stores'));
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', overflowY: 'auto', flex: 1, direction: 'rtl', textAlign: 'right' }}>

          {/* Store Info Card */}
          <div style={{ background: 'var(--bthwani-control-panel-surface-inset)', border: '1px solid var(--bthwani-control-panel-border)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text-muted)' }}>تفاصيل المتجر والفرع</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--bthwani-control-panel-brand)' }}>{activeStore.name} ({activeStore.branch})</div>
            <div style={{ fontSize: '12px', color: 'var(--bthwani-control-panel-text)' }}>
              <strong>وقت التجهيز:</strong> {activeStore.prepTime} | <strong>الطلبات الجاهزة:</strong> {activeStore.readyOrders}
            </div>
            {activeStore.issue && (
              <div style={{ fontSize: '12px', color: 'var(--bthwani-control-panel-danger)', fontWeight: 700 }}>
                ⚠️ {activeStore.issue}
              </div>
            )}
            <div style={{ fontSize: '12px', color: 'var(--bthwani-control-panel-text)' }}>
              <strong>طريقة التوصيل:</strong> {activeStore.deliveryMode === 'partner_delivery' ? 'توصيل المتجر' : 'توصيل بثواني'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--bthwani-control-panel-text)' }}>
              <strong>حالة استقبال الطلبات:</strong> <span style={{ fontWeight: 700, color: activeStore.status === 'مفتوح' ? 'var(--bthwani-control-panel-success)' : 'var(--bthwani-control-panel-danger)' }}>{activeStore.status}</span>
            </div>
          </div>

          {/* Governance / Boundary Rule Card */}
          <div style={{ background: 'var(--bthwani-control-panel-surface-inset)', border: '1px solid var(--bthwani-control-panel-border)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '16px' }}>⚖️</span>
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--bthwani-control-panel-text)' }}>حوكمة حظر الكتالوج الثنائي</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text-muted)', margin: 0, lineHeight: 1.4 }}>
              لا يتم تعديل أو استنساخ كتالوج الشريك أو بيانات الفئات والمنتجات داخل لوحة العمليات. للتحكم بالعقود والكتالوجات, يرجى الانتقال إلى القسم المخصص:
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => router.push(`/dsh/catalogs?storeId=${activeStore.id}`)}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: 'var(--bthwani-control-panel-surface)',
                  color: 'var(--bthwani-control-panel-brand)',
                  border: '1px solid var(--bthwani-control-panel-border)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                🔗 الكتالوجات (Catalogs)
              </button>
              <button
                type="button"
                onClick={() => router.push(`/dsh/partners?storeId=${activeStore.id}`)}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: 'var(--bthwani-control-panel-surface)',
                  color: 'var(--bthwani-control-panel-brand)',
                  border: '1px solid var(--bthwani-control-panel-border)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                🔗 ملف الشريك (Partners)
              </button>
            </div>
          </div>

          {/* Action Feedback Alerts */}
          {c.actionState.kind === 'error' && (
            <div style={{ background: 'var(--bthwani-control-panel-danger)', color: 'var(--bthwani-text-inverse)', borderRadius: '8px', padding: '10px', fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>
              {c.actionState.message}
            </div>
          )}
          {c.actionState.kind === 'conflict' && (
            <div style={{ background: 'var(--bthwani-control-panel-warning)', color: 'var(--bthwani-text-inverse)', borderRadius: '8px', padding: '10px', fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>
              {c.actionState.message}
            </div>
          )}
          {c.actionState.kind === 'success' && (
            <div style={{ background: 'var(--bthwani-control-panel-brand-surface)', border: '1px solid var(--bthwani-control-panel-brand)', color: 'var(--bthwani-control-panel-brand)', borderRadius: '8px', padding: '10px', fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>
              تم تطبيق إجراء الحوكمة بنجاح.
            </div>
          )}

          {/* Action CTAs — lifecycle (pause/resume order receiving) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
            {isSuspended ? (
              <button
                type="button"
                disabled={isSubmitting || !activeDetail}
                onClick={() => handleGovern('lifecycle', 'active', 'تنشيط استقبال الطلبات من لوحة العمليات')}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'var(--bthwani-control-panel-success)',
                  color: 'var(--bthwani-text-inverse)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isSubmitting || !activeDetail ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '12px',
                }}
              >
                {isSubmitting ? 'جاري التنشيط...' : 'تنشيط وإلغاء الإيقاف'}
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting || !activeDetail}
                onClick={() => handleGovern('lifecycle', 'temporarily_closed', 'إيقاف مؤقت لاستقبال الطلبات من لوحة العمليات')}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'var(--bthwani-control-panel-danger)',
                  color: 'var(--bthwani-text-inverse)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isSubmitting || !activeDetail ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '12px',
                }}
              >
                {isSubmitting ? 'جاري الإيقاف...' : 'إيقاف مؤقت استقبال الطلبات'}
              </button>
            )}
          </div>

          {/* Catalog Approval Gate — POST /dsh/operator/stores/{id}/governance (action=catalog-approval) */}
          <div style={{ background: 'var(--bthwani-control-panel-surface-inset)', border: '1px solid var(--bthwani-control-panel-border)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--bthwani-control-panel-text)' }}>⚙️ اعتماد الكتالوج</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                disabled={isSubmitting || !activeDetail}
                onClick={() => handleGovern('catalog-approval', 'approved', 'اعتماد الكتالوج من لوحة العمليات')}
                style={{ flex: 1, padding: '8px', fontSize: '11px', fontWeight: 700, background: 'var(--bthwani-control-panel-success)', color: 'var(--bthwani-text-inverse)', border: 'none', borderRadius: '6px', cursor: isSubmitting || !activeDetail ? 'not-allowed' : 'pointer' }}
              >
                {isSubmitting ? 'جارٍ...' : 'اعتماد الكتالوج'}
              </button>
              <button
                type="button"
                disabled={isSubmitting || !activeDetail}
                onClick={() => handleGovern('catalog-approval', 'rejected', 'رفض الكتالوج من لوحة العمليات')}
                style={{ flex: 1, padding: '8px', fontSize: '11px', fontWeight: 700, background: 'var(--bthwani-control-panel-danger)', color: 'var(--bthwani-text-inverse)', border: 'none', borderRadius: '6px', cursor: isSubmitting || !activeDetail ? 'not-allowed' : 'pointer' }}
              >
                {isSubmitting ? 'جارٍ...' : 'رفض الكتالوج'}
              </button>
            </div>
          </div>

          {/* Marketing Visibility Gate — POST /dsh/operator/stores/{id}/governance (action=marketing-visibility) */}
          <div style={{ background: 'var(--bthwani-control-panel-surface-inset)', border: '1px solid var(--bthwani-control-panel-border)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--bthwani-control-panel-text)' }}>📢 الظهور التسويقي</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                disabled={isSubmitting || !activeDetail}
                onClick={() => handleGovern('marketing-visibility', 'visible', 'تنشيط الظهور التسويقي من لوحة العمليات')}
                style={{ flex: 1, padding: '8px', fontSize: '11px', fontWeight: 700, background: 'var(--bthwani-control-panel-success)', color: 'var(--bthwani-text-inverse)', border: 'none', borderRadius: '6px', cursor: isSubmitting || !activeDetail ? 'not-allowed' : 'pointer' }}
              >
                {isSubmitting ? 'جارٍ...' : 'تنشيط التسويق'}
              </button>
              <button
                type="button"
                disabled={isSubmitting || !activeDetail}
                onClick={() => handleGovern('marketing-visibility', 'hidden', 'إيقاف الظهور التسويقي من لوحة العمليات')}
                style={{ flex: 1, padding: '8px', fontSize: '11px', fontWeight: 700, background: 'var(--bthwani-control-panel-warning)', color: 'var(--bthwani-text-inverse)', border: 'none', borderRadius: '6px', cursor: isSubmitting || !activeDetail ? 'not-allowed' : 'pointer' }}
              >
                {isSubmitting ? 'جارٍ...' : 'إيقاف التسويق'}
              </button>
            </div>
          </div>

        </div>
      </WebControlPanelInspectorShell>
    );
  }

  return (
    <Box gap={3}>
      <div className={styles.surfaceSectionHeader}>
        <h2 className={styles.surfaceSectionTitle}>المتاجر والشركاء</h2>
        {c.isNonSuccess && identity.kind === 'authenticated' && (
          <span style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-warning)', fontWeight: 700 }}>
            ⚠ تعذر تحميل بيانات المتاجر من API
          </span>
        )}
        {identity.kind === 'authenticated' && !c.isNonSuccess && (
          <span style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-success)', fontWeight: 700 }}>
            ● مصدر حي — GET /dsh/operator/stores
          </span>
        )}
        {identity.kind !== 'authenticated' && (
          <span style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text-muted)' }}>
            يتطلب تسجيل دخول مشغل
          </span>
        )}
      </div>

      <WebControlPanelKpiStrip
        items={[
          { id: 'open', label: 'مفتوحة الآن', value: String(rows.filter(r => r.status === 'مفتوح').length), tone: 'success' },
          { id: 'closed', label: 'مغلقة', value: String(rows.filter(r => r.status === 'مغلق').length), tone: 'neutral' },
          { id: 'suspended', label: 'موقوفة مؤقتاً', value: String(rows.filter(r => r.status === 'موقف مؤقتاً').length), tone: 'danger' },
          { id: 'total', label: 'إجمالي المتاجر', value: String(c.total), tone: 'neutral' },
        ]}
      />

      <div className={styles.surfaceInnerLayout}>
        <Box gap={2}>
          {rows.map((store) => (
            <WebControlPanelDecisionRow
              key={store.id}
              entityId={store.id}
              entityLabel={`${store.name} — ${store.branch}`}
              status={store.status}
              statusTone={store.statusTone}
              risk={store.statusTone === 'danger' ? 'danger' : store.statusTone === 'warning' ? 'warning' : 'neutral'}
              recommendation={store.suggestion.label}
              reason={store.suggestion.reason}
              sla={`التجهيز: ${store.prepTime} | جاهزة: ${store.readyOrders} | ${store.deliveryMode === 'partner_delivery' ? 'توصيل المتجر' : 'توصيل بثواني'}`}
              onInspect={() => {
                c.selectStore(store.id);
                router.push(buildOperationsHref('partner-stores', { orderId: store.id }));
              }}
              primaryAction={{
                id: `${store.id}-primary`,
                label: store.suggestion.action,
                onAction: () => {
                  c.selectStore(store.id);
                  router.push(buildOperationsHref('partner-stores', { orderId: store.id }));
                },
              }}
              secondaryAction={{
                id: `${store.id}-secondary`,
                label: store.suggestion.secondary || 'عرض التفاصيل',
                onAction: () => {
                  c.selectStore(store.id);
                  router.push(buildOperationsHref('partner-stores', { orderId: store.id }));
                },
              }}
            />
          ))}
        </Box>

        <Box gap={4}>
          {inspectorContent ?? (
            <WebControlPanelRecommendation
              title="تفاصيل الجاهزية والتحكم"
              reason="اختر متجراً من القائمة لعرض مؤشر الجاهزية التشغيلية وبوابات الحوكمة مع قسمي الشركاء والكتالوجات."
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
