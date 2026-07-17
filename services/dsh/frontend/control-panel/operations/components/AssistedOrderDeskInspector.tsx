'use client';

import React from 'react';
import { Box } from '@bthwani/ui-kit';
import styles from '../../shared/control-panel-surface.module.css';
import {
  type AssistedOrderDesk,
  IDENTITY_STATUS_META,
  SERVICEABILITY_STATUS_META,
  translateDesc,
} from './AssistedOrderDesk.types';

export type AssistedOrderDeskInspectorProps = {
  desk: AssistedOrderDesk;
  onClose: () => void;
  onUpdateLookup: (key: string, value: string) => void;
  onToggleVerificationStep: (stepId: string) => void;
  onUpdateCartItemQty: (sku: string, increment: number) => void;
  onUpdateCartItemStatus: (sku: string, status: 'active' | 'substitute' | 'unavailable') => void;
  onAddCartItem: () => void;
  onRemoveCartItem: (sku: string) => void;
  onSelectDeliveryMode: (modeId: string) => void;
  onToggleServiceability: () => void;
  onUpdateWltHandoff: (key: string, value: string) => void;
  onUpdateAuditReason: (key: string, value: string) => void;
  onSubmitDraft: () => void;
  submitStatus: string | null;
};

export function AssistedOrderDeskInspector({
  desk,
  onClose,
  onUpdateLookup,
  onToggleVerificationStep,
  onUpdateCartItemQty,
  onUpdateCartItemStatus,
  onAddCartItem,
  onRemoveCartItem,
  onSelectDeliveryMode,
  onToggleServiceability,
  onUpdateWltHandoff,
  onUpdateAuditReason,
  onSubmitDraft,
  submitStatus,
}: AssistedOrderDeskInspectorProps) {
  return (
    <aside className={styles.surfaceInspectorPanel}>
      {/* Header */}
      <div className={styles.surfaceInspectorHeader}>
        <div className={styles.surfaceInspectorHeaderText}>
          <p className={styles.surfaceInspectorTitle}>مسار المعالجة</p>
          <p className={styles.surfaceInspectorSubtitle}>{desk.customerName} · {desk.nextAction}</p>
        </div>
        <button
          type="button"
          className={styles.surfaceInspectorCloseBtn}
          onClick={onClose}
          aria-label="إغلاق"
        >
          ✕
        </button>
      </div>

      {/* Summary */}
      <div className={styles.surfaceInspectorSummary}>
        <div className={styles.surfaceInspectorSummaryRow}>
          <span className={styles.surfaceInspectorSummaryLabel}>الطلب</span>
          <span className={styles.surfaceInspectorSummaryValue} dir="ltr" style={{ display: 'inline-block' }}>{desk.orderId ?? '—'}</span>
        </div>
        <div className={styles.surfaceInspectorSummaryRow}>
          <span className={styles.surfaceInspectorSummaryLabel}>الهوية</span>
          <span className={styles.surfaceInspectorSummaryValue}>
            {IDENTITY_STATUS_META[desk.identityVerification.verificationStatus].label}
          </span>
        </div>
        <div className={styles.surfaceInspectorSummaryRow}>
          <span className={styles.surfaceInspectorSummaryLabel}>الخدمة</span>
          <span className={styles.surfaceInspectorSummaryValue}>
            {SERVICEABILITY_STATUS_META[desk.serviceabilitySummary.serviceabilityStatus].label}
          </span>
        </div>
        <div className={styles.surfaceInspectorSummaryRow}>
          <span className={styles.surfaceInspectorSummaryLabel}>الإجراء التالي</span>
          <span className={styles.surfaceInspectorSummaryValue}>{desk.submitDraftPreview.nextAction}</span>
        </div>
      </div>

      {/* Section: بحث العميل */}
      <div className={styles.surfaceInspectorSection}>
        <h4 className={styles.surfaceInspectorSectionTitle}>بيانات العميل</h4>
        <div className={styles.surfaceInspectorMeta}>
          {desk.lookupPanel.inputs.map((input) => {
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
                  onChange={(e) => onUpdateLookup(input.key, e.target.value)}
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
            {desk.identityVerification.verificationStatus}
          </span>
        </h4>
        <div className={styles.surfaceActionWrap}>
          {desk.identityVerification.verificationSteps.map((step) => (
            <button
              type="button"
              key={step.stepId}
              onClick={() => onToggleVerificationStep(step.stepId)}
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
          {desk.cartBuilderPreview.items.map((item) => (
            <div key={item.sku} className={styles.surfaceInspectorMeta}>
              <div className={styles.surfaceInspectorRow}>
                <strong style={{ fontSize: '11px' }}>{item.name}</strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => onUpdateCartItemQty(item.sku, -1)}
                    className={styles.quantityBtn}
                  >
                    −
                  </button>
                  <span style={{ fontSize: '12px', fontWeight: 700 }}>{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => onUpdateCartItemQty(item.sku, 1)}
                    className={styles.quantityBtn}
                  >
                    +
                  </button>
                  <select
                    value={item.status}
                    onChange={(e) => onUpdateCartItemStatus(item.sku, e.target.value as 'active' | 'substitute' | 'unavailable')}
                    className={styles.inspectorSelect}
                    style={{ width: 'auto', padding: '2px 4px', margin: 0 }}
                  >
                    <option value="active">نشط</option>
                    <option value="substitute">بديل</option>
                    <option value="unavailable">غير متاح</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => onRemoveCartItem(item.sku)}
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
          onClick={onAddCartItem}
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
          <span className={styles.surfaceInspectorSectionToken}>{desk.deliveryModeSelector.selectedMode}</span>
        </h4>
        <div className={styles.surfaceActionWrap}>
          {desk.deliveryModeSelector.options.map((option) => {
            const isSelected = option.modeId === desk.deliveryModeSelector.selectedMode;
            return (
              <button
                type="button"
                key={option.modeId}
                onClick={() => onSelectDeliveryMode(option.modeId)}
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
            <span>{translateDesc(desk.serviceabilitySummary.zoneLabel)}</span>
          </div>
          <div className={styles.surfaceInspectorRow}>
            <strong>الحالة</strong>
            <button
              type="button"
              onClick={onToggleServiceability}
              className={`${styles.surfaceMetaChip} ${styles.surfaceMetaChipClickable}`}
              style={{ border: 'none', padding: '2px 8px' }}
            >
              {SERVICEABILITY_STATUS_META[desk.serviceabilitySummary.serviceabilityStatus].label}
            </button>
          </div>
        </div>
      </div>

      {/* Section: رؤية WLT */}
      <div className={styles.surfaceInspectorSection}>
        <h4 className={styles.surfaceInspectorSectionTitle}>
          رؤية WLT
          <span className={styles.surfaceInspectorSectionToken}>{translateDesc(desk.wltReadOnlyHandoff.calculationTruthOwner)}</span>
        </h4>
        <div className={styles.surfaceInspectorMeta}>
          <div className={styles.surfaceInspectorRow} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <strong>رؤية الدفع</strong>
            <input
              type="text"
              value={translateDesc(desk.wltReadOnlyHandoff.paymentVisibility)}
              onChange={(e) => onUpdateWltHandoff('paymentVisibility', e.target.value)}
              className={styles.inspectorInput}
            />
          </div>
          <div className={styles.surfaceInspectorRow} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <strong>رؤية الاسترداد</strong>
            <input
              type="text"
              value={translateDesc(desk.wltReadOnlyHandoff.refundVisibility)}
              onChange={(e) => onUpdateWltHandoff('refundVisibility', e.target.value)}
              className={styles.inspectorInput}
            />
          </div>
          {desk.wltReadOnlyHandoff.settlementVisibility ? (
            <div className={styles.surfaceInspectorRow} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <strong>رؤية التسوية</strong>
              <input
                type="text"
                value={translateDesc(desk.wltReadOnlyHandoff.settlementVisibility)}
                onChange={(e) => onUpdateWltHandoff('settlementVisibility', e.target.value)}
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
              value={translateDesc(desk.auditReason.reasonLabel)}
              onChange={(e) => onUpdateAuditReason('reasonLabel', e.target.value)}
              className={styles.inspectorInput}
            />
          </div>
          <div className={styles.surfaceInspectorRow} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <strong>ملاحظة المشغّل</strong>
            <textarea
              value={desk.auditReason.operatorNote}
              onChange={(e) => onUpdateAuditReason('operatorNote', e.target.value)}
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
          onClick={onSubmitDraft}
          className={`${styles.surfaceTab} ${styles.surfaceTabActive}`}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          إرسال مسودة الطلب
        </button>
        {submitStatus && <div className={styles.overrideNotification}>{submitStatus}</div>}
      </div>
    </aside>
  );
}
