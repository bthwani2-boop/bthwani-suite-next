'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box } from '@bthwani/ui-kit';
import {
  WebControlPanelDecisionRow,
  WebControlPanelKpiStrip,
  WebControlPanelRecommendation,
} from '@bthwani/ui-kit/web';
import { buildOperationsHref } from './operations.registry';
import { DSH_FULFILLMENT_OPERATIONAL_MODE_META } from './operations.types';
import type { DshFulfillmentDeliveryMode } from '../../shared/delivery/delivery.contract';
import styles from '../shared/control-panel-surface.module.css';

export type AssistedOrderDeskScreenProps = {
  hubHref: string;
  subGroup?: string;
};

const translateDesc = (text: string) => {
  const descTranslations: Record<string, string> = {
    'Payment snapshot is read-only from WLT.': 'حالة الدفع من WLT للعرض فقط.',
    'Paid via WLT wallet snapshot — read-only visibility.': 'الدفع عبر محفظة WLT للعرض فقط.',
    'Refund execution remains WLT-owned; DSH displays status only.': 'تنفيذ الاسترداد مملوك لـ WLT؛ DSH يعرض الحالة فقط.',
    'Settlement remains WLT-owned; DSH displays status only.': 'التسوية مملوكة لـ WLT؛ DSH يعرض الحالة فقط.',
    'Partner settlement remains WLT-owned; DSH displays status only.': 'تسوية الشريك مملوكة لـ WLT؛ DSH يعرض الحالة فقط.',
    'Assisted order rebuild after manual call confirmation.': 'إعادة بناء الطلب المساعد بعد التأكيد الهاتفي اليدوي.',
    'DSH & WLT': 'نظام DSH والمحفظة WLT',
    'Riyadh / Al Yasmin': 'الرياض / الياسمين',
    'Riyadh / Al Malaz': 'الرياض / الملز',
    'Riyadh / Al Olaya': 'الرياض / العليا',
  };
  return descTranslations[text] ?? text;
};

const IDENTITY_STATUS_META = {
  verified: { label: 'هوية مؤكدة', tone: 'success' as const, risk: 'neutral' as const },
  required: { label: 'التحقق مطلوب', tone: 'warning' as const, risk: 'warning' as const },
  blocked: { label: 'محظور', tone: 'danger' as const, risk: 'danger' as const },
} as const;

const SERVICEABILITY_STATUS_META = {
  serviceable: { label: 'قابل للخدمة', tone: 'success' as const },
  blocked: { label: 'محظور', tone: 'danger' as const },
} as const;

type AssistedOrderVerificationStatus = keyof typeof IDENTITY_STATUS_META;
type AssistedOrderServiceabilityStatus = keyof typeof SERVICEABILITY_STATUS_META;
type AssistedOrderCartItemStatus = 'active' | 'substitute' | 'unavailable';

type AssistedLookupInput = {
  key: string;
  label?: string;
  value: string;
  [key: string]: unknown;
};

type AssistedVerificationStep = {
  stepId: string;
  label: string;
  completed: boolean;
  [key: string]: unknown;
};

type AssistedOrderCartItem = {
  sku: string;
  name: string;
  quantity: number;
  status: AssistedOrderCartItemStatus;
  published?: boolean;
  note?: string;
  [key: string]: unknown;
};

type AssistedDeliveryModeOption = {
  modeId: DshFulfillmentDeliveryMode;
  label: string;
  [key: string]: unknown;
};

type AssistedOrderDesk = {
  deskId: string;
  orderId?: string;
  customerId: string;
  ticketId?: string;
  customerName: string;
  basketSummary: string;
  nextAction: string;
  auditFlags: string[];
  lookupPanel: {
    inputs: AssistedLookupInput[];
  };
  identityVerification: {
    verificationStatus: AssistedOrderVerificationStatus;
    verificationSteps: AssistedVerificationStep[];
  };
  cartBuilderPreview: {
    items: AssistedOrderCartItem[];
  };
  deliveryModeSelector: {
    selectedMode: DshFulfillmentDeliveryMode;
    options: AssistedDeliveryModeOption[];
  };
  serviceabilitySummary: {
    serviceabilityStatus: AssistedOrderServiceabilityStatus;
    zoneLabel: string;
  };
  wltReadOnlyHandoff: {
    calculationTruthOwner: string;
    paymentVisibility: string;
    refundVisibility: string;
    settlementVisibility?: string;
    [key: string]: string | undefined;
  };
  auditReason: {
    reasonLabel: string;
    operatorNote: string;
    [key: string]: string;
  };
  submitDraftPreview: {
    nextAction: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type AssistedOrderPlaybook = {
  playbookId: string;
  title: string;
  checkpoints: string[];
  severity: 'danger' | 'warning' | 'neutral' | 'success';
};

export function AssistedOrderDeskScreen({ hubHref: _hubHref, subGroup: _subGroup }: AssistedOrderDeskScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [desks, setDesks] = React.useState<AssistedOrderDesk[]>([]);
  // null = no selection = full width queue
  const [selectedDeskId, setSelectedDeskId] = React.useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = React.useState<string | null>(null);

  React.useEffect(() => {
    // searchParams-based desk selection not yet implemented
  }, [searchParams]);

  const selectedDesk = React.useMemo(
    () => (selectedDeskId ? desks.find((d) => d.deskId === selectedDeskId) ?? null : null),
    [desks, selectedDeskId],
  );

  const relevantPlaybook = React.useMemo<AssistedOrderPlaybook | undefined>(
    () => undefined,
    [],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleUpdateLookup = (key: string, value: string) => {
    if (!selectedDesk) return;
    setDesks((prev) =>
      prev.map((d) =>
        d.deskId === selectedDesk.deskId
          ? { ...d, lookupPanel: { ...d.lookupPanel, inputs: d.lookupPanel.inputs.map((inp: AssistedLookupInput) => (inp.key === key ? { ...inp, value } : inp)) } }
          : d,
      ),
    );
  };

  const handleToggleVerificationStep = (stepId: string) => {
    if (!selectedDesk) return;
    setDesks((prev) =>
      prev.map((d) => {
        if (d.deskId !== selectedDesk.deskId) return d;
        const newSteps = d.identityVerification.verificationSteps.map((step) =>
          step.stepId === stepId ? { ...step, completed: !step.completed } : step,
        );
        const allCompleted = newSteps.every((s) => s.completed);
        return {
          ...d,
          identityVerification: {
            ...d.identityVerification,
            verificationStatus: allCompleted ? 'verified' : 'required',
            verificationSteps: newSteps,
          },
        };
      }),
    );
  };

  const handleUpdateCartItemQty = (sku: string, increment: number) => {
    if (!selectedDesk) return;
    setDesks((prev) =>
      prev.map((d) => {
        if (d.deskId !== selectedDesk.deskId) return d;
        return {
          ...d,
          cartBuilderPreview: {
            ...d.cartBuilderPreview,
            items: d.cartBuilderPreview.items.map((item) =>
              item.sku === sku ? { ...item, quantity: Math.max(1, item.quantity + increment) } : item,
            ),
          },
        };
      }),
    );
  };

  const handleUpdateCartItemStatus = (sku: string, status: 'active' | 'substitute' | 'unavailable') => {
    if (!selectedDesk) return;
    setDesks((prev) =>
      prev.map((d) => {
        if (d.deskId !== selectedDesk.deskId) return d;
        return {
          ...d,
          cartBuilderPreview: {
            ...d.cartBuilderPreview,
            items: d.cartBuilderPreview.items.map((item) => (item.sku === sku ? { ...item, status } : item)),
          },
        };
      }),
    );
  };

  const handleAddCartItem = () => {
    if (!selectedDesk) return;
    setDesks((prev) =>
      prev.map((d) => {
        if (d.deskId !== selectedDesk.deskId) return d;
        const newSku = `SKU-${Math.floor(100 + Math.random() * 900)}`;
        return {
          ...d,
          cartBuilderPreview: {
            ...d.cartBuilderPreview,
            items: [
              ...d.cartBuilderPreview.items,
              { sku: newSku, name: 'تفاح طازج مضاف', quantity: 1, published: true, status: 'active', note: 'صنف مضاف يدوياً.' },
            ],
          },
        };
      }),
    );
  };

  const handleRemoveCartItem = (sku: string) => {
    if (!selectedDesk) return;
    setDesks((prev) =>
      prev.map((d) => {
        if (d.deskId !== selectedDesk.deskId) return d;
        return {
          ...d,
          cartBuilderPreview: {
            ...d.cartBuilderPreview,
            items: d.cartBuilderPreview.items.filter((item) => item.sku !== sku),
          },
        };
      }),
    );
  };

  const handleSelectDeliveryMode = (modeId: string) => {
    if (!selectedDesk) return;
    setDesks((prev) =>
      prev.map((d) => {
        if (d.deskId !== selectedDesk.deskId) return d;
        return { ...d, deliveryModeSelector: { ...d.deliveryModeSelector, selectedMode: modeId as DshFulfillmentDeliveryMode } };
      }),
    );
  };

  const handleToggleServiceability = () => {
    if (!selectedDesk) return;
    setDesks((prev) =>
      prev.map((d) => {
        if (d.deskId !== selectedDesk.deskId) return d;
        const current = d.serviceabilitySummary.serviceabilityStatus;
        return {
          ...d,
          serviceabilitySummary: {
            ...d.serviceabilitySummary,
            serviceabilityStatus: current === 'serviceable' ? 'blocked' : 'serviceable',
          },
        };
      }),
    );
  };

  const handleUpdateWltHandoff = (key: string, value: string) => {
    if (!selectedDesk) return;
    setDesks((prev) =>
      prev.map((d) => {
        if (d.deskId !== selectedDesk.deskId) return d;
        return { ...d, wltReadOnlyHandoff: { ...d.wltReadOnlyHandoff, [key]: value } };
      }),
    );
  };

  const handleUpdateAuditReason = (key: string, value: string) => {
    if (!selectedDesk) return;
    setDesks((prev) =>
      prev.map((d) => {
        if (d.deskId !== selectedDesk.deskId) return d;
        return { ...d, auditReason: { ...d.auditReason, [key]: value } };
      }),
    );
  };

  const handleSubmitDraft = () => {
    if (!selectedDesk) return;
    setSubmitStatus(`تم تقديم مسودة الطلب للعميل ${selectedDesk.customerName} بنجاح.`);
    setTimeout(() => setSubmitStatus(null), 3500);
  };

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const kpis = React.useMemo(
    () => [
      { id: 'desk', label: 'حالات المساعدة', value: String(desks.length), tone: 'neutral' as const },
      {
        id: 'verified',
        label: 'هوية مؤكدة',
        value: String(desks.filter((d) => d.identityVerification.verificationStatus === 'verified').length),
        tone: 'success' as const,
      },
      {
        id: 'blocked',
        label: 'خدمة محظورة',
        value: String(desks.filter((d) => d.serviceabilitySummary.serviceabilityStatus === 'blocked').length),
        tone: 'warning' as const,
      },
      { id: 'wlt', label: 'WLT نشط', value: 'تفاعلي', tone: 'success' as const },
    ],
    [desks],
  );

  const hasInspector = selectedDesk !== null;

  return (
    <Box gap={3}>
      <div className={styles.surfaceSectionHeader}>
        <h2 className={styles.surfaceSectionTitle}>مكتب الطلبات المساعدة</h2>
        <p className={styles.surfaceSectionSubtitle}>
          اختر حالة من القائمة لعرض مسار المعالجة والتحكم الكامل.
        </p>
      </div>

      <WebControlPanelKpiStrip items={kpis} />

      {relevantPlaybook && !hasInspector ? (
        <WebControlPanelRecommendation
          title={relevantPlaybook.title}
          reason={relevantPlaybook.checkpoints.join(' · ')}
          confidence={relevantPlaybook.severity === 'danger' ? 'high' : 'medium'}
          auditTag={relevantPlaybook.playbookId}
          primaryAction={{
            id: 'open-rescue',
            label: 'فتح إنقاذ الطلب',
            onAction: () => router.push(buildOperationsHref('order-rescue')),
          }}
          secondaryAction={{
            id: 'open-command',
            label: 'غرفة القيادة',
            onAction: () => router.push(buildOperationsHref('command-center')),
          }}
        />
      ) : null}

      <div className={hasInspector ? styles.surfaceSplitGrid : styles.surfaceSplitGridFull}>
        {/* ── Queue column ── */}
        <div className={styles.surfaceListColumn}>
          <Box gap={2}>
            {desks.map((desk) => {
              const deskIdentity = IDENTITY_STATUS_META[desk.identityVerification.verificationStatus];
              const isSelected = desk.deskId === selectedDeskId;
              const modeLabel = DSH_FULFILLMENT_OPERATIONAL_MODE_META[desk.deliveryModeSelector.selectedMode]?.label ?? desk.deliveryModeSelector.selectedMode;
              const zoneLabels: Record<string, string> = {
                'Riyadh / Al Yasmin': 'الرياض / الياسمين',
                'Riyadh / Al Malaz': 'الرياض / الملز',
                'Riyadh / Al Olaya': 'الرياض / العليا',
              };
              const zone = zoneLabels[desk.serviceabilitySummary.zoneLabel] ?? desk.serviceabilitySummary.zoneLabel;
              return (
                <WebControlPanelDecisionRow
                  key={desk.deskId}
                  entityId={desk.orderId ?? desk.customerId}
                  entityLabel={`${desk.customerName} · ${desk.basketSummary}`}
                  status={deskIdentity.label}
                  statusTone={deskIdentity.tone}
                  risk={deskIdentity.risk}
                  recommendation={desk.submitDraftPreview.nextAction}
                  reason={`${modeLabel} · ${zone}`}
                  sla={desk.auditFlags.join(' · ')}
                  {...(isSelected ? { onInspect: () => setSelectedDeskId(null) } : {})}
                  primaryAction={{
                    id: `${desk.deskId}-open`,
                    label: isSelected ? 'إغلاق' : 'فتح workspace',
                    onAction: () => setSelectedDeskId(isSelected ? null : desk.deskId),
                  }}
                  secondaryAction={{
                    id: `${desk.deskId}-rescue`,
                    label: 'فتح الإنقاذ',
                    onAction: () =>
                      router.push(
                        buildOperationsHref('order-rescue', {
                          orderId: desk.orderId,
                          customerId: desk.customerId,
                          ticketId: desk.ticketId,
                        }),
                      ),
                  }}
                />
              );
            })}
          </Box>
        </div>

        {/* ── Inspector — only when desk is selected ── */}
        {hasInspector && selectedDesk ? (
          <aside className={styles.surfaceInspectorPanel}>
            {/* Header */}
            <div className={styles.surfaceInspectorHeader}>
              <div className={styles.surfaceInspectorHeaderText}>
                <p className={styles.surfaceInspectorTitle}>مسار المعالجة</p>
                <p className={styles.surfaceInspectorSubtitle}>{selectedDesk.customerName} · {selectedDesk.nextAction}</p>
              </div>
              <button
                type="button"
                className={styles.surfaceInspectorCloseBtn}
                onClick={() => setSelectedDeskId(null)}
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            {/* Summary */}
            <div className={styles.surfaceInspectorSummary}>
              <div className={styles.surfaceInspectorSummaryRow}>
                <span className={styles.surfaceInspectorSummaryLabel}>الطلب</span>
                <span className={styles.surfaceInspectorSummaryValue} dir="ltr" style={{ display: 'inline-block' }}>{selectedDesk.orderId ?? '—'}</span>
              </div>
              <div className={styles.surfaceInspectorSummaryRow}>
                <span className={styles.surfaceInspectorSummaryLabel}>الهوية</span>
                <span className={styles.surfaceInspectorSummaryValue}>
                  {IDENTITY_STATUS_META[selectedDesk.identityVerification.verificationStatus].label}
                </span>
              </div>
              <div className={styles.surfaceInspectorSummaryRow}>
                <span className={styles.surfaceInspectorSummaryLabel}>الخدمة</span>
                <span className={styles.surfaceInspectorSummaryValue}>
                  {SERVICEABILITY_STATUS_META[selectedDesk.serviceabilitySummary.serviceabilityStatus].label}
                </span>
              </div>
              <div className={styles.surfaceInspectorSummaryRow}>
                <span className={styles.surfaceInspectorSummaryLabel}>الإجراء التالي</span>
                <span className={styles.surfaceInspectorSummaryValue}>{selectedDesk.submitDraftPreview.nextAction}</span>
              </div>
            </div>

            {/* Section: بحث العميل */}
            <div className={styles.surfaceInspectorSection}>
              <h4 className={styles.surfaceInspectorSectionTitle}>بيانات العميل</h4>
              <div className={styles.surfaceInspectorMeta}>
                {selectedDesk.lookupPanel.inputs.map((input) => {
                  const lookupLabels: Record<string, string> = {
                    phone: 'رقم الهاتف',
                    orderId: 'معرّف الطلب',
                    customerId: 'معرّف العميل',
                    ticketId: 'معرّف التذكرة',
                  };
                  return (
                    <div key={input.key} className={styles.surfaceInspectorRow} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                      <strong>{lookupLabels[input.key] ?? input.label ?? input.key}</strong>
                      <input
                        type="text"
                        value={input.value}
                        onChange={(e) => handleUpdateLookup(input.key, e.target.value)}
                        className={styles.inspectorInput}
                        dir="ltr"
                        style={{ textAlign: 'right' }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section: التحقق من الهوية */}
            <div className={styles.surfaceInspectorSection}>
              <h4 className={styles.surfaceInspectorSectionTitle}>
                التحقق من الهوية
                <span className={styles.surfaceInspectorSectionToken}>
                  {selectedDesk.identityVerification.verificationStatus}
                </span>
              </h4>
              <div className={styles.surfaceActionWrap}>
                {selectedDesk.identityVerification.verificationSteps.map((step) => (
                  <button
                    type="button"
                    key={step.stepId}
                    onClick={() => handleToggleVerificationStep(step.stepId)}
                    className={`${styles.surfaceMetaChip} ${styles.surfaceMetaChipClickable} ${
                      step.completed ? styles.surfaceMetaChipActive : ''
                    }`}
                    style={{ border: 'none' }}
                  >
                    {step.completed ? '✓' : '○'} {step.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Section: السلة */}
            <div className={styles.surfaceInspectorSection}>
              <h4 className={styles.surfaceInspectorSectionTitle}>السلة</h4>
              <Box gap={1}>
                {selectedDesk.cartBuilderPreview.items.map((item) => (
                  <div key={item.sku} className={styles.surfaceInspectorMeta}>
                    <div className={styles.surfaceInspectorRow}>
                      <strong style={{ fontSize: '11px' }}>{item.name}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleUpdateCartItemQty(item.sku, -1)}
                          className={styles.quantityBtn}
                        >
                          −
                        </button>
                        <span style={{ fontSize: '12px', fontWeight: 700 }}>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateCartItemQty(item.sku, 1)}
                          className={styles.quantityBtn}
                        >
                          +
                        </button>
                        <select
                          value={item.status}
                          onChange={(e) => handleUpdateCartItemStatus(item.sku, e.target.value as 'active' | 'substitute' | 'unavailable')}
                          className={styles.inspectorSelect}
                          style={{ width: 'auto', padding: '2px 4px', margin: 0 }}
                        >
                          <option value="active">نشط</option>
                          <option value="substitute">بديل</option>
                          <option value="unavailable">غير متاح</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveCartItem(item.sku)}
                          className={styles.quantityBtn}
                          style={{ background: 'var(--bthwani-danger)', color: 'var(--bthwani-text-inverse)', border: 'none' }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </Box>
              <button
                type="button"
                onClick={handleAddCartItem}
                className={`${styles.surfaceMetaChip} ${styles.surfaceMetaChipClickable}`}
                style={{ border: 'none' }}
              >
                + إضافة صنف
              </button>
            </div>

            {/* Section: وضع التوصيل */}
            <div className={styles.surfaceInspectorSection}>
              <h4 className={styles.surfaceInspectorSectionTitle}>
                وضع التوصيل
                <span className={styles.surfaceInspectorSectionToken}>{selectedDesk.deliveryModeSelector.selectedMode}</span>
              </h4>
              <div className={styles.surfaceActionWrap}>
                {selectedDesk.deliveryModeSelector.options.map((option) => {
                  const isSelected = option.modeId === selectedDesk.deliveryModeSelector.selectedMode;
                  return (
                    <button
                      type="button"
                      key={option.modeId}
                      onClick={() => handleSelectDeliveryMode(option.modeId)}
                      className={`${styles.surfaceMetaChip} ${styles.surfaceMetaChipClickable} ${
                        isSelected ? styles.surfaceMetaChipActive : ''
                      }`}
                      style={{ border: 'none' }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section: قابلية الخدمة */}
            <div className={styles.surfaceInspectorSection}>
              <h4 className={styles.surfaceInspectorSectionTitle}>قابلية الخدمة</h4>
              <div className={styles.surfaceInspectorMeta}>
                <div className={styles.surfaceInspectorRow}>
                  <strong>المنطقة</strong>
                  <span>{translateDesc(selectedDesk.serviceabilitySummary.zoneLabel)}</span>
                </div>
                <div className={styles.surfaceInspectorRow}>
                  <strong>الحالة</strong>
                  <button
                    type="button"
                    onClick={handleToggleServiceability}
                    className={`${styles.surfaceMetaChip} ${styles.surfaceMetaChipClickable}`}
                    style={{ border: 'none', padding: '2px 8px' }}
                  >
                    {SERVICEABILITY_STATUS_META[selectedDesk.serviceabilitySummary.serviceabilityStatus].label}
                  </button>
                </div>
              </div>
            </div>

            {/* Section: رؤية WLT */}
            <div className={styles.surfaceInspectorSection}>
              <h4 className={styles.surfaceInspectorSectionTitle}>
                رؤية WLT
                <span className={styles.surfaceInspectorSectionToken}>{translateDesc(selectedDesk.wltReadOnlyHandoff.calculationTruthOwner)}</span>
              </h4>
              <div className={styles.surfaceInspectorMeta}>
                <div className={styles.surfaceInspectorRow} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <strong>رؤية الدفع</strong>
                  <input
                    type="text"
                    value={translateDesc(selectedDesk.wltReadOnlyHandoff.paymentVisibility)}
                    onChange={(e) => handleUpdateWltHandoff('paymentVisibility', e.target.value)}
                    className={styles.inspectorInput}
                  />
                </div>
                <div className={styles.surfaceInspectorRow} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <strong>رؤية الاسترداد</strong>
                  <input
                    type="text"
                    value={translateDesc(selectedDesk.wltReadOnlyHandoff.refundVisibility)}
                    onChange={(e) => handleUpdateWltHandoff('refundVisibility', e.target.value)}
                    className={styles.inspectorInput}
                  />
                </div>
                {selectedDesk.wltReadOnlyHandoff.settlementVisibility ? (
                  <div className={styles.surfaceInspectorRow} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <strong>رؤية التسوية</strong>
                    <input
                      type="text"
                      value={translateDesc(selectedDesk.wltReadOnlyHandoff.settlementVisibility)}
                      onChange={(e) => handleUpdateWltHandoff('settlementVisibility', e.target.value)}
                      className={styles.inspectorInput}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            {/* Section: التدقيق */}
            <div className={styles.surfaceInspectorSection}>
              <h4 className={styles.surfaceInspectorSectionTitle}>التدقيق</h4>
              <div className={styles.surfaceInspectorMeta}>
                <div className={styles.surfaceInspectorRow} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <strong>سبب القرار</strong>
                  <input
                    type="text"
                    value={translateDesc(selectedDesk.auditReason.reasonLabel)}
                    onChange={(e) => handleUpdateAuditReason('reasonLabel', e.target.value)}
                    className={styles.inspectorInput}
                  />
                </div>
                <div className={styles.surfaceInspectorRow} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <strong>ملاحظة المشغّل</strong>
                  <textarea
                    value={selectedDesk.auditReason.operatorNote}
                    onChange={(e) => handleUpdateAuditReason('operatorNote', e.target.value)}
                    className={styles.inspectorTextarea}
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Submit draft */}
            <div style={{ paddingTop: '4px' }}>
              <button
                type="button"
                onClick={handleSubmitDraft}
                className={`${styles.surfaceTab} ${styles.surfaceTabActive}`}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                إرسال مسودة الطلب
              </button>
              {submitStatus && <div className={styles.overrideNotification}>{submitStatus}</div>}
            </div>
          </aside>
        ) : null}
      </div>
    </Box>
  );
}

export default AssistedOrderDeskScreen;
