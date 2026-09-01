'use client';

import React from 'react';
import { useIdentitySession } from '@bthwani/core-identity';
import { Box, StateView } from '@bthwani/ui-kit';
import {
  WebControlPanelDecisionRow,
  WebControlPanelInspectorShell,
  WebControlPanelKpiStrip,
  WebControlPanelQueue,
} from '@bthwani/ui-kit/web';
import {
  fetchDshOperationalProfile,
  fetchZoneServiceability,
  upsertDshOperationalProfile,
  useZonesController,
  type DshOperationalProfile,
  type DshZone,
  type DshZoneServiceability,
} from '../../shared/platform';
import {
  CONTROL_PANEL_CAPABILITIES,
  hasAllControlPanelPermissions,
} from '../../shared/session/control-panel-permissions';
import styles from '../shared/control-panel-surface.module.css';

export type AreaCapacityScreenProps = { hubHref: string; subGroup?: string };

type CapacityForm = {
  maxConcurrentOrders: string;
  maxCaptainsOnline: string;
  throttleThreshold: string;
};

type CapacityRuntime = {
  profile: DshOperationalProfile;
  serviceability: DshZoneServiceability;
};

type CapacityState =
  | { kind: 'loading' }
  | { kind: 'success'; data: CapacityRuntime }
  | { kind: 'error'; message: string };

const EMPTY_FORM: CapacityForm = {
  maxConcurrentOrders: '',
  maxCaptainsOnline: '',
  throttleThreshold: '',
};

function parseNonNegativeInteger(value: string, field: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${field} يجب أن يكون عددًا صحيحًا غير سالب`);
  }
  return parsed;
}

function parsePositiveInteger(value: string, field: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${field} يجب أن يكون عددًا صحيحًا أكبر من صفر`);
  }
  return parsed;
}

function parseUnitInterval(value: string, field: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new Error(`${field} يجب أن يكون قيمة بين 0 و1`);
  }
  return parsed;
}

function messageFrom(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

function CapacityInspector({
  zone,
  onClose,
  onToggle,
  canReadProfile,
  canManageProfile,
  canManageZone,
}: {
  zone: DshZone;
  onClose: () => void;
  onToggle: (zone: DshZone, nextActive: boolean) => Promise<boolean>;
  canReadProfile: boolean;
  canManageProfile: boolean;
  canManageZone: boolean;
}) {
  const [state, setState] = React.useState<CapacityState>({ kind: 'loading' });
  const [form, setForm] = React.useState<CapacityForm>(EMPTY_FORM);
  const [pendingAction, setPendingAction] = React.useState<'toggle' | 'save' | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!canReadProfile) {
      setState({
        kind: 'error',
        message: 'تحتاج صلاحيات قراءة المنطقة وSLA والسعة لعرض الملف التشغيلي الكانوني.',
      });
      return;
    }
    setState({ kind: 'loading' });
    try {
      const [{ profile }, serviceability] = await Promise.all([
        fetchDshOperationalProfile(zone.id),
        fetchZoneServiceability(zone.id),
      ]);
      setState({ kind: 'success', data: { profile, serviceability } });
    } catch (error) {
      setState({
        kind: 'error',
        message: messageFrom(error, 'تعذر تحميل الملف التشغيلي الكانوني للمنطقة.'),
      });
    }
  }, [canReadProfile, zone.id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (state.kind !== 'success') return;
    const capacity = state.data.profile.capacity;
    if (!capacity.configured) {
      setForm(EMPTY_FORM);
      return;
    }
    setForm({
      maxConcurrentOrders: String(capacity.maxConcurrentOrders ?? ''),
      maxCaptainsOnline: String(capacity.maxCaptainsOnline ?? ''),
      throttleThreshold: String(capacity.throttleThreshold ?? ''),
    });
  }, [state]);

  const updateField = React.useCallback((field: keyof CapacityForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFeedback(null);
  }, []);

  const handleSave = React.useCallback(async () => {
    if (!canManageProfile) {
      setFeedback('تحتاج صلاحيات إدارة SLA والسعة معًا لتعديل الملف التشغيلي.');
      return;
    }
    if (state.kind !== 'success') return;

    setPendingAction('save');
    setFeedback(null);
    try {
      const { profile } = state.data;
      const sla = profile.sla;
      const capacity = profile.capacity;
      if (
        !sla.configured ||
        !sla.category ||
        sla.maxPrepMins == null ||
        sla.maxAssignmentMins == null ||
        sla.maxDeliveryMins == null ||
        sla.warningBeforeMins == null ||
        sla.pickupNotifyMins == null ||
        sla.pickupArrivalMins == null ||
        sla.pickupVerifyMins == null ||
        sla.deliveryAssignToPickupMins == null ||
        sla.deliveryPickupToDepartMins == null ||
        sla.deliveryDepartToArriveMins == null ||
        sla.deliveryArriveToProofMins == null ||
        sla.version == null
      ) {
        throw new Error(
          'لا يمكن تعديل السعة منفردة قبل اكتمال SLA الكانوني؛ أكمل الملف التشغيلي من شاشة سياسات المنصة أولًا.',
        );
      }
      const pauseReason = (capacity.pauseReason ?? '').trim();
      if (capacity.isPaused && pauseReason.length < 3) {
        throw new Error('الملف الحالي موقوف دون سبب صالح؛ صحح الملف التشغيلي الكانوني قبل أي تعديل.');
      }

      await upsertDshOperationalProfile(zone.id, {
        slaCategory: sla.category,
        maxPrepMins: sla.maxPrepMins,
        maxAssignmentMins: sla.maxAssignmentMins,
        maxDeliveryMins: sla.maxDeliveryMins,
        warningBeforeMins: sla.warningBeforeMins,
        pickupNotifyMins: sla.pickupNotifyMins,
        pickupArrivalMins: sla.pickupArrivalMins,
        pickupVerifyMins: sla.pickupVerifyMins,
        deliveryAssignToPickupMins: sla.deliveryAssignToPickupMins,
        deliveryPickupToDepartMins: sla.deliveryPickupToDepartMins,
        deliveryDepartToArriveMins: sla.deliveryDepartToArriveMins,
        deliveryArriveToProofMins: sla.deliveryArriveToProofMins,
        expectedSlaVersion: sla.version,
        maxConcurrentOrders: parsePositiveInteger(
          form.maxConcurrentOrders,
          'أقصى الطلبات المتزامنة',
        ),
        maxCaptainsOnline: parseNonNegativeInteger(
          form.maxCaptainsOnline,
          'أقصى الكباتن المتصلين',
        ),
        throttleThreshold: parseUnitInterval(form.throttleThreshold, 'حد الاختناق'),
        isPaused: capacity.isPaused,
        pauseReason: capacity.isPaused ? pauseReason : '',
        expectedCapacityVersion: capacity.version ?? 0,
        reason: 'تحديث السعة التشغيلية للمنطقة من مساحة العمليات',
      });
      await load();
      setFeedback('تم حفظ السعة عبر الملف التشغيلي الكانوني وقراءة الحالة المحدثة.');
    } catch (error) {
      setFeedback(messageFrom(error, 'تعذر حفظ إعدادات السعة.'));
    } finally {
      setPendingAction(null);
    }
  }, [canManageProfile, form, load, state, zone.id]);

  const handleToggle = React.useCallback(async () => {
    if (!canManageZone) {
      setFeedback('تحتاج صلاحية إدارة مناطق الخدمة لتغيير حالة المنطقة.');
      return;
    }
    setPendingAction('toggle');
    setFeedback(null);
    try {
      const updated = await onToggle(zone, !zone.isActive);
      if (!updated) {
        throw new Error('رفض الخادم تحديث حالة المنطقة. أعد تحميل البيانات ثم حاول مجددًا.');
      }
      setFeedback('تم تحديث حالة المنطقة من الحقيقة التشغيلية الحية.');
    } catch (error) {
      setFeedback(messageFrom(error, 'تعذر تحديث حالة المنطقة.'));
    } finally {
      setPendingAction(null);
    }
  }, [canManageZone, onToggle, zone]);

  return (
    <WebControlPanelInspectorShell title={`المنطقة والسعة — ${zone.name}`} onClose={onClose}>
      <div className={`${styles.surfaceStackSmall} ${styles.surfaceStatePadding}`}>
        <div><strong>المعرّف:</strong> <span dir="ltr">{zone.id}</span></div>
        <div><strong>رمز نطاق الخدمة:</strong> {zone.serviceAreaCode}</div>
        <div><strong>حالة المنطقة:</strong> {zone.isActive ? 'نشطة' : 'غير نشطة'}</div>

        {state.kind === 'loading' ? (
          <p>جارٍ جلب الملف التشغيلي وقابلية الخدمة...</p>
        ) : state.kind === 'error' ? (
          <StateView
            stateId="recoverableError"
            title="تعذر تحميل تفاصيل المنطقة"
            description={state.message}
            actionLabel="إعادة المحاولة"
            onActionPress={() => void load()}
          />
        ) : (
          <>
            <div><strong>المتاجر النشطة:</strong> {state.data.serviceability.activeStores}</div>
            <div><strong>قابلية الخدمة:</strong> {state.data.serviceability.isActive ? 'متاحة' : 'متوقفة'}</div>
            <div><strong>SLA:</strong> {state.data.profile.sla.configured ? 'مكتمل' : 'غير مكتمل'}</div>
            <div><strong>السعة:</strong> {state.data.profile.capacity.configured ? 'مكتملة' : 'غير مكتملة'}</div>
            <div><strong>حالة السعة:</strong> {state.data.profile.capacity.isPaused ? 'موقوفة' : 'فعالة'}</div>

            <label>
              أقصى الطلبات المتزامنة
              <input
                type="number"
                min={1}
                value={form.maxConcurrentOrders}
                onChange={(event) => updateField('maxConcurrentOrders', event.target.value)}
                disabled={pendingAction !== null || !canManageProfile}
              />
            </label>
            <label>
              أقصى الكباتن المتصلين
              <input
                type="number"
                min={0}
                value={form.maxCaptainsOnline}
                onChange={(event) => updateField('maxCaptainsOnline', event.target.value)}
                disabled={pendingAction !== null || !canManageProfile}
              />
            </label>
            <label>
              حد الاختناق (0–1)
              <input
                type="number"
                min={0}
                max={1}
                step="0.01"
                value={form.throttleThreshold}
                onChange={(event) => updateField('throttleThreshold', event.target.value)}
                disabled={pendingAction !== null || !canManageProfile}
              />
            </label>

            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={pendingAction !== null || !canManageProfile}
            >
              {pendingAction === 'save' ? 'جارٍ الحفظ...' : 'حفظ السعة عبر الملف التشغيلي'}
            </button>
            {!canManageProfile ? (
              <p>التعديل يتطلب صلاحيات إدارة SLA والسعة معًا لأنهما جزء من ملف تشغيلي واحد.</p>
            ) : null}
          </>
        )}

        <button
          type="button"
          onClick={() => void handleToggle()}
          disabled={pendingAction !== null || !canManageZone}
        >
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
  const { state: sessionState } = useIdentitySession();
  const identity = sessionState.kind === 'authenticated' ? sessionState.identity : null;
  const canReadZones = hasAllControlPanelPermissions(
    identity,
    CONTROL_PANEL_CAPABILITIES.dshServiceAreasRead,
  );
  const canManageZone = hasAllControlPanelPermissions(
    identity,
    CONTROL_PANEL_CAPABILITIES.dshServiceAreasManage,
  );
  const canReadProfile = hasAllControlPanelPermissions(
    identity,
    CONTROL_PANEL_CAPABILITIES.dshOperationalProfileRead,
  );
  const canManageProfile = hasAllControlPanelPermissions(
    identity,
    CONTROL_PANEL_CAPABILITIES.dshOperationalProfileManage,
  );
  const { state, reload, toggle } = useZonesController(
    canReadZones ? 'authenticated' : 'restricted',
  );
  const [selectedZoneId, setSelectedZoneId] = React.useState<string | null>(null);

  if (!canReadZones) {
    return (
      <StateView
        stateId="recoverableError"
        title="صلاحية قراءة المناطق مطلوبة"
        description="تحتاج صلاحية قراءة مناطق الخدمة للوصول إلى مساحة السعة التشغيلية."
      />
    );
  }

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
        <p className={styles.surfaceSectionSubtitleCompact}>
          عرض تشغيلي مركّز يقرأ ويحدّث نفس Operational Profile الكانوني المستخدم في سياسات المنصة.
        </p>
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
              reason={`رمز نطاق الخدمة: ${zone.serviceAreaCode}`}
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
            onToggle={(zone, nextActive) => toggle(zone, nextActive)}
            canReadProfile={canReadProfile}
            canManageProfile={canManageProfile}
            canManageZone={canManageZone}
          />
        ) : (
          <StateView stateId="empty" title="اختر منطقة" description="افتح منطقة لعرض السعة وقابلية الخدمة من الملف التشغيلي الكانوني." />
        )}
      </div>
    </Box>
  );
}

export default AreaCapacityScreen;
