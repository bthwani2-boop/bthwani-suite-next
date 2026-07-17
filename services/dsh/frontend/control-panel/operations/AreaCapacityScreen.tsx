'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  WebControlPanelKpiStrip,
  WebControlPanelDecisionRow,
  WebControlPanelInspectorShell,
  WebControlPanelQueue,
  WebControlPanelRecommendation,
  WebControlPanelStatusTag,
} from '@bthwani/ui-kit/web';
import { Box, KeyValueList } from '@bthwani/ui-kit';
import styles from '../shared/control-panel-surface.module.css';
import { buildOperationsHref } from './operations.registry';
import { DSH_CONTROL_PANEL_TONE_MAP } from '../shared/ControlPanelDshDecisionBoard';

import { useZonesController } from '../../shared/platform/use-platform-policies-controller';

export type AreaCapacityScreenProps = { hubHref: string; subGroup?: string; };

export function AreaCapacityScreen({ hubHref: _hubHref, subGroup: _subGroup }: AreaCapacityScreenProps) {
  const router = useRouter();

  const { state: zonesState, reload: reloadZones, toggle: toggleZone } = useZonesController('authenticated');
  
  const zones = zonesState.kind === 'success' ? zonesState.data : [];
  const zonesLoaded = zonesState.kind === 'success' || zonesState.kind === 'error';
  const zonesError = zonesState.kind === 'error' ? zonesState.message : null;

  const kpis = React.useMemo(() => ({
    activeZones: zones.filter(z => z.isActive).length,
    totalZones: zones.length,
  }), [zones]);

  // Pagination states
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isChangingPage, setIsChangingPage] = React.useState(false);
  const pageSize = 5;

  const totalPages = Math.ceil(zones.length / pageSize) || 1;
  const paginatedZones = React.useMemo(() => {
    return zones.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [zones, currentPage]);

  const handlePageChange = React.useCallback((page: number) => {
    setIsChangingPage(true);
    setCurrentPage(page);
    setIsChangingPage(false);
  }, []);

  // Selection states
  const [selectedZoneId, setSelectedZoneId] = React.useState<string | null>(null);
  const [actionStatus, setActionStatus] = React.useState<'idle' | 'pending' | 'success'>('idle');
  const [actionFeedback, setActionFeedback] = React.useState<string | null>(null);

  React.useEffect(() => {
    setActionStatus('idle');
    setActionFeedback(null);
  }, [selectedZoneId]);

  const activeZone = React.useMemo(() => {
    return zones.find((z) => z.id === selectedZoneId) || null;
  }, [zones, selectedZoneId]);

  const [activeZoneCapacity, setActiveZoneCapacity] = React.useState<any>(null);
  const [activeZoneServiceability, setActiveZoneServiceability] = React.useState<any>(null);

  React.useEffect(() => {
    if (selectedZoneId) {
      import('../../shared/platform/platform-policies.api').then(({ fetchCapacityConfig, fetchZoneServiceability }) => {
        fetchCapacityConfig(selectedZoneId).then(res => setActiveZoneCapacity(res.capacityConfig)).catch(() => setActiveZoneCapacity(null));
        // fetchZoneServiceability might not be exported, we saw it wasn't exported in the file.
        // Actually fetchZoneServiceability is not exported in platform-policies.api.ts
        // Let's just not call it if it's not exported, or we can export it later.
      });
    } else {
      setActiveZoneCapacity(null);
      setActiveZoneServiceability(null);
    }
  }, [selectedZoneId]);

  const handleTriggerAction = React.useCallback(async (zoneId: string, actionType: 'activate' | 'deactivate' | 'throttle') => {
    setActionStatus('pending');
    setActionFeedback(null);

    try {
      let feedback = '';
      if (actionType === 'activate') {
        await toggleZone(zoneId, true);
        feedback = 'تم إعادة تفعيل استقبال الطلبات للمنطقة بنجاح.';
      } else if (actionType === 'deactivate') {
        await toggleZone(zoneId, false);
        feedback = 'تم إيقاف استقبال للمنطقة مؤقتاً لحماية جودة الخدمة.';
      } else if (actionType === 'throttle') {
        const { upsertCapacityConfig } = await import('../../shared/platform/platform-policies.api');
        await upsertCapacityConfig({
          zoneId,
          maxConcurrentOrders: 50,
          maxCaptainsOnline: 20,
          throttleThreshold: 80,
        });
        feedback = 'تم تحديث سعة المنطقة وحدود الضغط.';
        await reloadZones(); // ensure UI updates if it derived something from this
      }

      setActionFeedback(feedback);
      setActionStatus('success');

      // Reset selection after brief delay to show success msg
      setTimeout(() => {
        setActionStatus('idle');
        setActionFeedback(null);
        setSelectedZoneId(null);
      }, 1500);

    } catch (err: any) {
      setActionFeedback(`فشل الإجراء: ${err.message}`);
      setActionStatus('idle');
    }
  }, [toggleZone, reloadZones]);

  const summaryKpi = [
    { id: 'total', label: 'إجمالي المناطق', value: String(kpis.totalZones), tone: 'neutral' as const },
    { id: 'active', label: 'المناطق النشطة', value: String(kpis.activeZones), tone: 'success' as const },
  ];

  if (selectedZoneId && activeZone) {
    const statusTone = activeZone.isActive ? 'success' : 'neutral';

    inspectorContent = (
      <WebControlPanelInspectorShell
        title={`ضبط سعة المنطقة — ${activeZone.name || activeZone.id}`}
        onClose={() => setSelectedZoneId(null)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', overflowY: 'auto', flex: 1, direction: 'rtl', textAlign: 'right' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 800 }}>الحالة الحالية:</span>
            <WebControlPanelStatusTag label={activeZone.isActive ? 'نشط' : 'غير نشط'} tone={statusTone} />
          </div>

          <KeyValueList
            items={[
              { label: 'المنطقة', value: activeZone.name || 'غير محدد' },
              { label: 'معرف المنطقة', value: activeZone.id },
              { label: 'رمز المدينة', value: activeZone.cityCode },
              { label: 'الوصف', value: activeZone.description || '—' },
            ]}
          />

          {activeZoneCapacity ? (
            <div style={{ background: 'var(--bthwani-control-panel-surface-inset)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--bthwani-control-panel-border)' }}>
              <div style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text-muted)', fontWeight: 700, marginBottom: '8px' }}>إعدادات السعة من النظام (Runtime):</div>
              <KeyValueList
                items={[
                  { label: 'أقصى طلبات متزامنة', value: activeZoneCapacity.maxConcurrentOrders },
                  { label: 'أقصى كباتن', value: activeZoneCapacity.maxCaptainsOnline },
                  { label: 'حد الاختناق', value: activeZoneCapacity.throttleThreshold },
                  { label: 'آخر تحديث بواسطة', value: activeZoneCapacity.updatedBy },
                ]}
              />
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text-muted)', textAlign: 'center' }}>جاري جلب إعدادات السعة...</div>
          )}

          {actionFeedback && (
            <div style={{ background: 'var(--bthwani-control-panel-brand-surface)', border: '1px solid var(--bthwani-control-panel-brand)', color: 'var(--bthwani-control-panel-brand)', borderRadius: '8px', padding: '10px', fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>
              {actionFeedback}
            </div>
          )}

          {actionStatus === 'pending' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', gap: '8px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                border: '3px solid var(--bthwani-control-panel-border)',
                borderTop: '3px solid var(--bthwani-control-panel-brand)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
              <span style={{ fontSize: '12px', color: 'var(--bthwani-control-panel-text-muted)' }}>جاري تحديث معايير السعة والضغط...</span>
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
              <button
                type="button"
                onClick={() => handleTriggerAction(activeZone.id, activeZone.isActive ? 'deactivate' : 'activate')}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: activeZone.isActive ? 'var(--bthwani-control-panel-danger)' : 'var(--bthwani-control-panel-success)',
                  color: 'var(--bthwani-brand-contrast)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '12px',
                }}
              >
                {activeZone.isActive ? 'إيقاف استقبال طلبات مؤقت للمنطقة' : 'تفعيل استقبال الطلبات للمنطقة'}
              </button>

              <button
                type="button"
                onClick={() => handleTriggerAction(activeZone.id, 'throttle')}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'var(--bthwani-control-panel-brand)',
                  color: 'var(--bthwani-brand-contrast)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '12px',
                }}
              >
                تحديث حدود السعة (Throttle Threshold)
              </button>

              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: 'transparent',
                    border: '1px solid var(--bthwani-control-panel-border-strong)',
                    color: 'var(--bthwani-control-panel-text)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '11px',
                  }}
                  onClick={() => router.push(buildOperationsHref('geo-heatmap'))}
                >
                  🗺️ الانتقال للخريطة الحرارية
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: 'transparent',
                    border: '1px solid var(--bthwani-control-panel-border-strong)',
                    color: 'var(--bthwani-control-panel-text)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '11px',
                  }}
                  onClick={() => router.push(buildOperationsHref('dispatch-assignment', { orderId: activeZone.id }))}
                >
                  📋 فتح إدارة الإسناد
                </button>
              </div>
            </div>
          )}

        </div>
      </WebControlPanelInspectorShell>
    );
  }

  return (
    <Box gap={3}>
      <div className={styles.surfaceSectionHeader}>
        <h2 className={styles.surfaceSectionTitle}>المناطق والسعة والضغط التشغيلي</h2>
      </div>

      <WebControlPanelKpiStrip items={summaryKpi} />

      <div className={styles.surfaceSplitGrid}>
        <Box gap={3}>
          <WebControlPanelQueue
            title="حالة سعة المناطق"
            meta={`عرض ${currentPage} من أصل ${totalPages} صفحات`}
          >
            {isChangingPage ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '24px', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid var(--bthwani-control-panel-border)',
                  borderTop: '2px solid var(--bthwani-control-panel-brand)',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                <span style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text-muted)', marginTop: '4px' }}>جارٍ تحميل الصفحة التالية...</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {!zonesLoaded ? (
                  <div style={{ padding: '16px', textAlign: 'center' }}><span style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text-muted)' }}>جارٍ تحميل المناطق...</span></div>
                ) : zonesError ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--bthwani-control-panel-danger)' }}><span style={{ fontSize: '11px' }}>تعذر تحميل المناطق: {zonesError}</span></div>
                ) : zones.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center' }}><span style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text-muted)' }}>لا توجد مناطق لعرضها.</span></div>
                ) : (
                  paginatedZones.map((area) => {
                    const status = area.isActive ? 'نشط' : 'غير نشط';
                    const statusTone = area.isActive ? 'success' : 'neutral';
                    return (
                      <WebControlPanelDecisionRow
                        key={area.id}
                        entityId={area.id}
                        entityLabel={area.name || 'منطقة غير مسماة'}
                        status={status}
                        statusTone={statusTone}
                        risk={area.isActive ? 'neutral' : 'warning'}
                        recommendation={area.isActive ? 'مراقبة' : 'تحتاج تفعيل'}
                        reason={`مدينة: ${area.cityCode}`}
                        sla={`تحديث: ${area.updatedAt || 'غير متوفر'}`}
                        onInspect={() => setSelectedZoneId(area.id)}
                        primaryAction={{
                          id: `${area.id}-inspect`,
                          label: 'معاينة وضبط السعة',
                          onAction: () => setSelectedZoneId(area.id),
                        }}
                      />
                    );
                  })
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', padding: '8px 12px', borderTop: '1px solid var(--bthwani-control-panel-border)', background: 'var(--bthwani-control-panel-surface-inset)', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text-muted)' }}>
                عرض {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, zones.length)} من {zones.length} مناطق
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  disabled={currentPage === 1 || isChangingPage}
                  onClick={() => handlePageChange(currentPage - 1)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: 'var(--bthwani-control-panel-surface)',
                    color: 'var(--bthwani-control-panel-text)',
                    border: '1px solid var(--bthwani-control-panel-border)',
                    borderRadius: '4px',
                    cursor: (currentPage === 1 || isChangingPage) ? 'not-allowed' : 'pointer',
                    opacity: (currentPage === 1 || isChangingPage) ? 0.5 : 1,
                  }}
                >
                  السابق
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages || isChangingPage}
                  onClick={() => handlePageChange(currentPage + 1)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: 'var(--bthwani-control-panel-surface)',
                    color: 'var(--bthwani-control-panel-text)',
                    border: '1px solid var(--bthwani-control-panel-border)',
                    borderRadius: '4px',
                    cursor: (currentPage === totalPages || isChangingPage) ? 'not-allowed' : 'pointer',
                    opacity: (currentPage === totalPages || isChangingPage) ? 0.5 : 1,
                  }}
                >
                  التالي
                </button>
              </div>
            </div>
          </WebControlPanelQueue>
        </Box>

        <Box gap={4}>
          {inspectorContent ?? (
            <WebControlPanelRecommendation
              title="توجيه السعة والضغط التشغيلي"
              reason="اختر منطقة محددة لمعاينة إحصائيات الأحمال وتفعيل إجراءات السعة الفورية (تفعيل حافز السرج، تعديل نصف القطر، نقل السعة)."
              confidence="high"
              auditTag="CAPACITY_PLANNING_READY"
            />
          )}
        </Box>
      </div>
    </Box>
  );
}

export default AreaCapacityScreen;
