'use client';

import React from 'react';
import { Box, StateView } from '@bthwani/ui-kit';
import {
  WebControlPanelDecisionRow,
  WebControlPanelInspectorShell,
  WebControlPanelKpiStrip,
  WebControlPanelQueue,
} from '@bthwani/ui-kit/web';
import type { DshZone } from '../../shared/platform/platform-policies.types';
import {
  useAreaCapacityController,
  useZonesController,
} from '../../shared/platform/use-platform-policies-controller';
import styles from '../shared/control-panel-surface.module.css';

export type AreaCapacityScreenProps = { hubHref: string; subGroup?: string };

type CapacityForm = {
  maxConcurrentOrders: string;
  maxCaptainsOnline: string;
  throttleThreshold: string;
};

const EMPTY_FORM: CapacityForm = {
  maxConcurrentOrders: '',
  maxCaptainsOnline: '',
  throttleThreshold: '',
};

function parsePositiveInteger(value: string, field: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${field} يجب أن يكون عددًا صحيحًا غير سالب`);
  }
  return parsed;
}

function CapacityInspector({
  zone,
  onClose,
  onToggle,
}: {
  zone: DshZone;
  onClose: () => void;
  onToggle: (zone: DshZone, nextActive: boolean) => Promise<void>;
}) {
  const { state, reload, save } = useAreaCapacityController('authenticated', zone.id);
  const [form, setForm] = React.useState<CapacityForm>(EMPTY_FORM);
  const [pendingAction, setPendingAction] = React.useState<'toggle' | 'save' | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (state.kind !== 'success') return;
    const capacityConfig = state.data.capacityConfig;
    if (!capacityConfig) {
      setForm(EMPTY_FORM);
      return;
    }
    setForm({
      maxConcurrentOrders: String(capacityConfig.maxConcurrentOrders),
      maxCaptainsOnline: String(capacityConfig.maxCaptainsOnline),
      throttleThreshold: String(capacityConfig.throttleThreshold),
    });
  }, [state]);

  const updateField = React.useCallback((field: keyof CapacityForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFeedback(null);
  }, []);

  const handleSave = React.useCallback(async () => {
    setPendingAction('save');
    setFeedback(null);
    try {
      await save({
        maxConcurrentOrders: parsePositiveInteger(form.maxConcurrentOrders, 'أقصى الطلبات المتزامنة'),
        maxCaptainsOnline: parsePositiveInteger(form.maxCaptainsOnline, 'أقصى الكباتن المتصلين'),
        throttleThreshold: parsePositiveInteger(form.throttleThreshold, 'حد الاختناق'),
        reason: 'تحديث السعة التشغيلية للمنطقة من لوحة التحكم',
      });
      setFeedback('تم حفظ السعة وقراءة القيم المحدثة من النظام.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'تعذر حفظ إعدادات السعة');
    } finally {
      setPendingAction(null);
    }
  }, [form, save]);

  const handleToggle = React.useCallback(async () => {
    setPendingAction('toggle');
    setFeedback(null);
    try {
      await onToggle(zone, !zone.isActive);
      setFeedback('تم تحديث حالة المنطقة وقراءة القائمة من النظام.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'تعذر تحديث حالة المنطقة');
    } finally {
      setPendingAction(null);
    }
  }, [onToggle, zone]);

  return (
    <WebControlPanelInspectorShell title={`المنطقة والسعة — ${zone.name}`} onClose={onClose}>
      <div className={styles.surfaceStackSmall} style={{ padding: 16 }}>
        <div><strong>المعرّف:</strong> <span dir="ltr">{zone.id}</span></div>
        <div><strong>رمز المدينة:</strong> {zone.cityCode}</div>
        <div><strong>حالة المنطقة:</strong> {zone.isActive ? 'نشطة' : 'غير نشطة'}</div>

        {state.kind === 'idle' || state.kind === 'loading' ? (
          <p>جارٍ جلب السعة وقابلية الخدمة...</p>
        ) : state.kind === 'error' ? (
          <StateView
            stateId="recoverableError"
            title="تعذر تحميل تفاصيل المنطقة"
            description={state.message}
            actionLabel="إعادة المحاولة"
            onActionPress={() => void reload()}
          />
        ) : (
          <>
            <div><strong>المتاجر النشطة:</strong> {state.data.serviceability.activeStores}</div>
            <div><strong>قابلية الخدمة:</strong> {state.data.serviceability.isActive ? 'متاحة' : 'متوقفة'}</div>
            <div><strong>SLA:</strong> {state.data.serviceability.slaAvailable ? 'متاح' : 'غير متاح'}</div>

            <label>
              أقصى الطلبات المتزامنة
              <input
                type="number"
                min={0}
                value={form.maxConcurrentOrders}
                onChange={(event) => updateField('maxConcurrentOrders', event.target.value)}
                disabled={pendingAction !== null}
              />
            </label>
            <label>
              أقصى الكباتن المتصلين
              <input
                type="number"
                min={0}
                value={form.maxCaptainsOnline}
                onChange={(event) => updateField('maxCaptainsOnline', event.target.value)}
                disabled={pendingAction !== null}
              />
            </label>
            <label>
              حد الاختناق
              <input
                type="number"
                min={0}
                value={form.throttleThreshold}
                onChange={(event) => updateField('throttleThreshold', event.target.value)}
                disabled={pendingAction !== null}
              />
            </label>

            <button type="button" onClick={() => void handleSave()} disabled={pendingAction !== null}>
              {pendingAction === 'save' ? 'جارٍ الحفظ...' : 'حفظ إعدادات السعة'}
            </button>
          </>
        )}

        <button type="button" onClick={() => void handleToggle()} disabled={pendingAction !== null}>
          {pendingAction === 'toggle'
            ? 'جارٍ التحديث...'
            : zone.isActive
              ? 'إيقاف استقبال الطلبات للمنطقة'
              : 'تفعيل استقبال الطلبات للمنطقة'}
        </button>

        {feedback ? <p role="status">{feedback}</p> : null}
      </div>
    </WebControlPanelInspectorShell>
  );
}

export function AreaCapacityScreen({ hubHref: _hubHref, subGroup: _subGroup }: AreaCapacityScreenProps) {
  const { state, reload, toggle } = useZonesController('authenticated');
  const [selectedZoneId, setSelectedZoneId] = React.useState<string | null>(null);

  if (state.kind === 'idle' || state.kind === 'loading') {
    return <StateView stateId="loading" title="جارٍ تحميل المناطق" description="يتم جلب الحقيقة التشغيلية من الخادم." />;
  }

  if (state.kind === 'error') {
    return (
      <StateView
        stateId="recoverableError"
        title="تعذر تحميل المناطق"
        description={state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={() => void reload()}
      />
    );
  }

  const zones = state.data;
  const selectedZone = zones.find((zone) => zone.id === selectedZoneId) ?? null;
  const activeCount = zones.filter((zone) => zone.isActive).length;

  return (
    <Box gap={3}>
      <div className={styles.surfaceSectionHeader}>
        <h2 className={styles.surfaceSectionTitle}>المناطق والسعة التشغيلية</h2>
        <p className={styles.surfaceSectionSubtitleCompact}>بيانات حية مع تحديث وقراءة راجعة من DSH.</p>
      </div>

      <WebControlPanelKpiStrip items={[
        { id: 'total', label: 'إجمالي المناطق', value: String(zones.length), tone: 'neutral' },
        { id: 'active', label: 'المناطق النشطة', value: String(activeCount), tone: 'success' },
        { id: 'inactive', label: 'المناطق المتوقفة', value: String(zones.length - activeCount), tone: zones.length === activeCount ? 'neutral' : 'warning' },
      ]} />

      <div className={styles.surfaceSplitGrid}>
        <WebControlPanelQueue title="قائمة المناطق" meta={`${zones.length} منطقة`}>
          {zones.length === 0 ? (
            <StateView stateId="empty" title="لا توجد مناطق" description="لم يُرجع الخادم أي منطقة تشغيلية." actionLabel="تحديث" onActionPress={() => void reload()} />
          ) : zones.map((zone) => (
            <WebControlPanelDecisionRow
              key={zone.id}
              entityId={zone.id}
              entityLabel={zone.name}
              status={zone.isActive ? 'نشطة' : 'متوقفة'}
              statusTone={zone.isActive ? 'success' : 'warning'}
              recommendation="فتح التفاصيل"
              reason={`رمز المدينة: ${zone.cityCode}`}
              sla={`آخر تحديث: ${zone.updatedAt}`}
              onInspect={() => setSelectedZoneId(zone.id)}
              primaryAction={{ id: `${zone.id}-inspect`, label: 'عرض السعة', onAction: () => setSelectedZoneId(zone.id) }}
            />
          ))}
        </WebControlPanelQueue>

        {selectedZone ? (
          <CapacityInspector
            zone={selectedZone}
            onClose={() => setSelectedZoneId(null)}
            onToggle={async (zone, nextActive) => { await toggle(zone, nextActive); }}
          />
        ) : (
          <StateView stateId="empty" title="اختر منطقة" description="افتح منطقة لعرض السعة وقابلية الخدمة وتحديثهما." />
        )}
      </div>
    </Box>
  );
}

export default AreaCapacityScreen;
