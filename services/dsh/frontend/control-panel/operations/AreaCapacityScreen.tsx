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
import { DSH_CONTROL_PANEL_TONE_MAP } from '../../shared/runtime';

export type AreaCapacityScreenProps = { hubHref: string; subGroup?: string; };

export function AreaCapacityScreen({ hubHref: _hubHref, subGroup: _subGroup }: AreaCapacityScreenProps) {
  const router = useRouter();

  // Stateful zones data list
  const [zones, setZones] = React.useState(() => [
    {
      id: 'AR-05',
      zone: 'غرب الرياض',
      zoneLoad: 'متوازن',
      customZoneLoad: 'متوازن',
      protectedZones: '3',
      customProtectedZones: '3',
      freeZones: '3',
      customFreeZones: '3',
      surgeBonus: 'لا حاجة',
      customSurgeBonus: 'لا حاجة',
      reduceRadius: 'غير مطلوب',
      temporaryStop: 'غير مطلوب',
      moveCapacity: 'غير مطلوب',
      recommendation: 'لا تدخل مطلوب',
      customRecommendation: 'لا تدخل مطلوب',
      note: 'التغطية مثالية والسعة مستقرة.',
      customNote: 'التغطية مثالية والسعة مستقرة.',
      statusTone: 'best',
      customStatusTone: 'best' as const,
    },
    {
      id: 'AR-06',
      zone: 'شمال جدة',
      zoneLoad: 'مرتفع',
      customZoneLoad: 'مرتفع',
      protectedZones: '2',
      customProtectedZones: '2',
      freeZones: '0',
      customFreeZones: '0',
      surgeBonus: 'حافز مقترح',
      customSurgeBonus: 'حافز مقترح',
      reduceRadius: 'تقليل نصف القطر',
      temporaryStop: 'غير متاح',
      moveCapacity: 'نقل السعة للجنوب',
      recommendation: 'فعّل الحافز الإضافي',
      customRecommendation: 'فعّل الحافز الإضافي',
      note: 'نقص كباتن في الفترات المسائية.',
      customNote: 'نقص كباتن في الفترات المسائية.',
      statusTone: 'danger',
      customStatusTone: 'danger' as const,
    },
    {
      id: 'AR-07',
      zone: 'وسط جدة',
      zoneLoad: 'متوازن',
      customZoneLoad: 'متوازن',
      protectedZones: '4',
      customProtectedZones: '4',
      freeZones: '2',
      customFreeZones: '2',
      surgeBonus: 'لا حاجة',
      customSurgeBonus: 'لا حاجة',
      reduceRadius: 'غير مطلوب',
      temporaryStop: 'غير مطلوب',
      moveCapacity: 'غير مطلوب',
      recommendation: 'لا تدخل مطلوب',
      customRecommendation: 'لا تدخل مطلوب',
      note: 'حالة الاستقبال مستقرة تماماً ولا عوائق.',
      customNote: 'حالة الاستقبال مستقرة تماماً ولا عوائق.',
      statusTone: 'best',
      customStatusTone: 'best' as const,
    },
    {
      id: 'AR-08',
      zone: 'مكة المكرمة',
      zoneLoad: 'متصاعد',
      customZoneLoad: 'متصاعد',
      protectedZones: '2',
      customProtectedZones: '2',
      freeZones: '1',
      customFreeZones: '1',
      surgeBonus: 'حافز جزئي',
      customSurgeBonus: 'حافز جزئي',
      reduceRadius: 'تقليل النطاق',
      temporaryStop: 'متاح للحظات',
      moveCapacity: 'نقل السعة',
      recommendation: 'قلّص نطاق التغطية مؤقتًا',
      customRecommendation: 'قلّص نطاق التغطية مؤقتًا',
      note: 'ضغط مستمر بسبب فترات العمرة وتدفق الزوار.',
      customNote: 'ضغط مستمر بسبب فترات العمرة وتدفق الزوار.',
      statusTone: 'warning',
      customStatusTone: 'warning' as const,
    },
    {
      id: 'AR-09',
      zone: 'المدينة المنورة',
      zoneLoad: 'متوازن',
      customZoneLoad: 'متوازن',
      protectedZones: '3',
      customProtectedZones: '3',
      freeZones: '3',
      customFreeZones: '3',
      surgeBonus: 'لا حاجة',
      customSurgeBonus: 'لا حاجة',
      reduceRadius: 'غير مطلوب',
      temporaryStop: 'غير مطلوب',
      moveCapacity: 'غير مطلوب',
      recommendation: 'لا تدخل مطلوب',
      customRecommendation: 'لا تدخل مطلوب',
      note: 'التغطية مستقرة والأحمال معتدلة.',
      customNote: 'التغطية مستقرة والأحمال معتدلة.',
      statusTone: 'best',
      customStatusTone: 'best' as const,
    },
    {
      id: 'AR-10',
      zone: 'الدمام',
      zoneLoad: 'فائض',
      customZoneLoad: 'فائض',
      protectedZones: '1',
      customProtectedZones: '1',
      freeZones: '5',
      customFreeZones: '5',
      surgeBonus: 'احتياطي',
      customSurgeBonus: 'احتياطي',
      reduceRadius: 'لا حاجة',
      temporaryStop: 'لا حاجة',
      moveCapacity: 'انقل السعة للخبر',
      recommendation: 'انقل السعة للمناطق المضغوطة',
      customRecommendation: 'انقل السعة للمناطق المضغوطة',
      note: 'سعة فائضة للكباتن وتغطية طلبات سريعة.',
      customNote: 'سعة فائضة للكباتن وتغطية طلبات سريعة.',
      statusTone: 'brand',
      customStatusTone: 'brand' as const,
    },
  ]);

  // Stateful KPIs summary
  const [kpis, setKpis] = React.useState<{ zoneLoad: string; protectedZones: number; freeZones: number; surgeBonus: string }>({
    zoneLoad: '—',
    protectedZones: 0,
    freeZones: 0,
    surgeBonus: '—',
  });

  // Pagination states
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isChangingPage, setIsChangingPage] = React.useState(false);
  const pageSize = 3;

  const totalPages = Math.ceil(zones.length / pageSize);
  const paginatedZones = React.useMemo(() => {
    return zones.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [zones, currentPage]);

  const handlePageChange = React.useCallback((page: number) => {
    setIsChangingPage(true);
    setTimeout(() => {
      setCurrentPage(page);
      setIsChangingPage(false);
    }, 300);
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

  const handleTriggerAction = React.useCallback((zoneId: string, actionType: 'surge' | 'radius' | 'stop') => {
    setActionStatus('pending');
    setActionFeedback(null);

    setTimeout(() => {
      setActionStatus('success');

      let feedback = '';
      let loadUpdate = '';
      let statusToneUpdate: 'warning' | 'danger' | 'best' | 'brand' = 'brand';
      let surgeUpdate = '';
      let protectedUpdate = '';
      let freeUpdate = '';
      let recommendationUpdate = '';
      let noteUpdate = '';

      if (actionType === 'surge') {
        const isCurrentActive = zones.find((z) => z.id === zoneId)?.customSurgeBonus === 'حافز مفعل';
        if (isCurrentActive) {
          feedback = 'تم إلغاء تفعيل حافز المنطقة بنجاح وعودة التسعير القياسي.';
          surgeUpdate = 'لا حاجة';
          loadUpdate = 'متوازن';
          statusToneUpdate = 'best';
          recommendationUpdate = 'لا تدخل مطلوب';
          noteUpdate = 'تم إلغاء الحافز وعادت السعة للتوازن القياسي.';
        } else {
          feedback = 'تم تفعيل حافز المنطقة (+20% Surge) لزيادة توفر الكباتن.';
          surgeUpdate = 'حافز مفعل';
          loadUpdate = 'متوازن';
          statusToneUpdate = 'best';
          recommendationUpdate = 'مراقبة تطور الأحمال';
          noteUpdate = 'حافز السرج نشط وجاري استقطاب سعة إضافية.';
        }
      } else if (actionType === 'radius') {
        feedback = 'تم تقليص نصف قطر تغطية الطلبات للمنطقة للحد من تراكم الأحمال.';
        surgeUpdate = 'حافز جزئي';
        loadUpdate = 'متوازن';
        statusToneUpdate = 'best';
        recommendationUpdate = 'لا تدخل مطلوب';
        noteUpdate = 'تم تقليص نصف القطر وحماية التزام الـ SLA بنجاح.';
      } else if (actionType === 'stop') {
        feedback = 'تم إيقاف الاستقبال للمنطقة مؤقتاً لحماية جودة الخدمة.';
        surgeUpdate = 'غير مطلوب';
        loadUpdate = 'موقوف مؤقتاً';
        statusToneUpdate = 'danger';
        recommendationUpdate = 'إعادة تنشيط الاستقبال لاحقاً';
        noteUpdate = 'المنطقة موقوفة مؤقتاً لتخفيف تراكم الطلبات.';
      }

      setActionFeedback(feedback);

      setTimeout(() => {
        setZones((prev) =>
          prev.map((z) =>
            z.id === zoneId
              ? {
                  ...z,
                  customZoneLoad: loadUpdate || z.customZoneLoad,
                  customStatusTone: statusToneUpdate || z.customStatusTone,
                  customSurgeBonus: surgeUpdate || z.customSurgeBonus,
                  customProtectedZones: protectedUpdate || z.customProtectedZones,
                  customFreeZones: freeUpdate || z.customFreeZones,
                  customRecommendation: recommendationUpdate || z.customRecommendation,
                  customNote: z.customNote ? `${z.customNote} | ${noteUpdate}` : noteUpdate,
                }
              : z
          )
        );

        // Update KPIs summary
        if (actionType === 'surge') {
          setKpis((prev) => ({
            ...prev,
            zoneLoad: 'أحمال متوازنة',
            surgeBonus: 'مفعل نشط',
          }));
        } else if (actionType === 'radius') {
          setKpis((prev) => ({
            ...prev,
            zoneLoad: 'أحمال مستقرة',
            freeZones: prev.freeZones + 1,
          }));
        } else if (actionType === 'stop') {
          setKpis((prev) => ({
            ...prev,
            zoneLoad: 'أحمال موقوفة',
            protectedZones: Math.max(0, prev.protectedZones - 1),
          }));
        }

        setActionStatus('idle');
        setActionFeedback(null);
        setSelectedZoneId(null);
      }, 1200);
    }, 1000);
  }, [zones]);

  const summaryKpi = [
    { id: 'load', label: 'حِمل المنطقة', value: kpis.zoneLoad, tone: 'danger' as const },
    { id: 'protected', label: 'المناطق المحمية', value: String(kpis.protectedZones), tone: 'neutral' as const },
    { id: 'free', label: 'المناطق الحرة', value: String(kpis.freeZones), tone: 'neutral' as const },
    { id: 'surge', label: 'الحافز المقترح', value: kpis.surgeBonus, tone: 'success' as const },
  ];

  // Inspector Component details
  let inspectorContent: React.ReactNode = null;
  if (selectedZoneId && activeZone) {
    const statusTone = DSH_CONTROL_PANEL_TONE_MAP[activeZone.customStatusTone] ?? 'neutral';

    inspectorContent = (
      <WebControlPanelInspectorShell
        title={`ضبط سعة المنطقة — ${activeZone.zone}`}
        onClose={() => setSelectedZoneId(null)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', overflowY: 'auto', flex: 1, direction: 'rtl', textAlign: 'right' }}>

          {/* Lazy Loaded indicator */}
          <div style={{ background: 'var(--bthwani-success-surface)', border: '1px solid var(--bthwani-control-panel-success)', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--bthwani-control-panel-success)' }}>⚡ تحميل أداء ذكي</div>
            <p style={{ fontSize: '10px', color: 'var(--bthwani-control-panel-text-muted)', margin: 0, lineHeight: 1.4 }}>
              تم جلب مؤشرات الضغط ومخطط السعة لهذه المنطقة بنجاح بشكل منفصل عند الفتح لتخفيف حِمل الاتصال وحماية سرعة استجابة الصفحة.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 800 }}>الضغط الحالي:</span>
            <WebControlPanelStatusTag label={activeZone.customZoneLoad} tone={statusTone} />
          </div>

          <KeyValueList
            items={[
              { label: 'المنطقة', value: activeZone.zone },
              { label: 'معرف المنطقة', value: activeZone.id },
              { label: 'المناطق المحمية', value: activeZone.customProtectedZones },
              { label: 'المناطق الحرة', value: activeZone.customFreeZones },
              { label: 'الحافز الإضافي المقترح', value: activeZone.customSurgeBonus },
              { label: 'الإجراء الموصى به', value: activeZone.customRecommendation },
            ]}
          />

          <div style={{ background: 'var(--bthwani-control-panel-surface-inset)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--bthwani-control-panel-border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text-muted)', fontWeight: 700 }}>سجل حالة التشغيل والضغط:</div>
            <div style={{ fontSize: '12px', color: 'var(--bthwani-control-panel-text)', marginTop: '4px', lineHeight: 1.5 }}>{activeZone.customNote}</div>
          </div>

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
                onClick={() => handleTriggerAction(activeZone.id, 'surge')}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: activeZone.customSurgeBonus === 'حافز مفعل' ? 'var(--bthwani-control-panel-surface)' : 'var(--bthwani-control-panel-success)',
                  color: activeZone.customSurgeBonus === 'حافز مفعل' ? 'var(--bthwani-control-panel-text)' : 'var(--bthwani-brand-contrast)',
                  border: activeZone.customSurgeBonus === 'حافز مفعل' ? '1px solid var(--bthwani-control-panel-border)' : 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '12px',
                }}
              >
                {activeZone.customSurgeBonus === 'حافز مفعل' ? 'إلغاء تفعيل حافز المنطقة' : 'تفعيل حافز المنطقة (+20% Surge)'}
              </button>

              <button
                type="button"
                onClick={() => handleTriggerAction(activeZone.id, 'radius')}
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
                تقليص نطاق التغطية
              </button>

              <button
                type="button"
                onClick={() => handleTriggerAction(activeZone.id, 'stop')}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'var(--bthwani-control-panel-danger)',
                  color: 'var(--bthwani-brand-contrast)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '12px',
                }}
              >
                إيقاف استقبال طلبات مؤقت للمنطقة
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
                {paginatedZones.map((area) => {
                  const statusTone = DSH_CONTROL_PANEL_TONE_MAP[area.customStatusTone] ?? 'neutral';
                  return (
                    <WebControlPanelDecisionRow
                      key={area.id}
                      entityId={area.id}
                      entityLabel={area.zone}
                      status={area.customZoneLoad}
                      statusTone={statusTone}
                      risk={area.customStatusTone === 'danger' ? 'danger' : area.customStatusTone === 'warning' ? 'warning' : 'neutral'}
                      recommendation={area.customRecommendation}
                      reason={area.customNote}
                      sla={`محمية: ${area.customProtectedZones} | حرة: ${area.customFreeZones} | حافز: ${area.customSurgeBonus}`}
                      onInspect={() => setSelectedZoneId(area.id)}
                      primaryAction={{
                        id: `${area.id}-inspect`,
                        label: 'معاينة وضبط السعة',
                        onAction: () => setSelectedZoneId(area.id),
                      }}
                    />
                  );
                })}
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
