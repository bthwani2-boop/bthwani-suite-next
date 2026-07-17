'use client';

import React from 'react';
import { Text } from '@bthwani/ui-kit';
import {
  type DshOrderRescueCase,
  type DshOrderRescueNextActionId,
  type DshOrderRescueOwner,
  type DshOrderRescueReason,
} from '../../../shared/orders';
import styles from '../../shared/control-panel-surface.module.css';

type RescueCase = DshOrderRescueCase;

// Label maps — enum keys only
const REASON_LABELS: Record<string, string> = {
  item_unavailable:        'صنف غير متاح',
  customer_not_reachable:  'العميل لا يرد',
  store_closed_after_order:'المتجر مغلق بعد الطلب',
  captain_no_show:         'الكابتن لم يظهر',
  captain_declined:        'الكابتن رفض الطلب',
  pickup_failed:           'فشل الاستلام',
  handoff_mismatch:        'خلل في التسليم',
  delivery_failed:         'فشل التوصيل',
  address_issue:           'مشكلة في العنوان',
  payment_failure:         'فشل الدفع',
  wlt_visibility:          'مراقبة WLT',
};

const OWNER_LABELS: Record<string, string> = {
  support:           'الدعم',
  operations:        'العمليات',
  partner:           'الشريك',
  captain:           'الكابتن',
  wlt_reference_only:'WLT — مرجع',
};

const ACTION_LABELS: Record<string, string> = {
  replace_item:               'استبدال الصنف',
  remove_item:                'إزالة الصنف',
  wait_customer:              'انتظار العميل',
  change_delivery_mode:       'تغيير طريقة التوصيل',
  reassign_captain:           'إعادة إسناد الكابتن',
  convert_to_support_exception:'تحويل لاستثناء دعم',
  create_follow_up_task:      'إنشاء مهمة متابعة',
  open_wlt_visibility:        'فتح رؤية WLT',
};

const WLT_FIELD_LABELS: Record<string, string> = {
  paymentVisibility:    'رؤية الدفع',
  refundVisibility:     'رؤية الاسترداد',
  settlementVisibility: 'رؤية التسوية',
};

function resolveLabel(map: Record<string, string>, key: string): string {
  return map[key] ?? key;
}

/** Count how many of the 3 decision steps are "filled" */
export function getCompletedSteps(item: RescueCase): number {
  let count = 0;
  if (item.rescueReasonSelector.selectedReason) count++;
  if (item.ownerSelection.selectedOwner) count++;
  if (item.nextActionSelector.selectedAction) count++;
  return count;
}

// ── Step number renderer ──────────────────────────────────────────────────────

function StepNum({ n, muted = false }: { n: string | number; muted?: boolean }) {
  return (
    <span
      className={`${styles.rescueStepNum} ${muted ? styles.rescueStepNumMuted : ''}`}
      aria-hidden="true"
    >
      {n}
    </span>
  );
}

// ── Single rescue case row + inline accordion ─────────────────────────────────

export function RescueCaseRow({
  item,
  isOpen,
  overriddenActions,
  onToggle,
  onSelectReason,
  onSelectOwner,
  onSelectNextAction,
  onUpdateEvidence,
  onUpdateWlt,
  onToggleForbidden,
  onSubmit,
  submitNote,
  onNavigate,
}: {
  item: RescueCase;
  isOpen: boolean;
  overriddenActions: Record<string, boolean>;
  onToggle: () => void;
  onSelectReason: (r: DshOrderRescueReason) => void;
  onSelectOwner: (o: DshOrderRescueOwner) => void;
  onSelectNextAction: (a: DshOrderRescueNextActionId) => void;
  onUpdateEvidence: (key: string, value: string) => void;
  onUpdateWlt: (key: string, value: string) => void;
  onToggleForbidden: (action: string) => void;
  onSubmit: () => void;
  submitNote: string | null;
  onNavigate: (href: string) => void;
}) {
  const isDanger = item.severity === 'danger';
  const completedSteps = getCompletedSteps(item);
  const totalDecisionSteps = 3;

  return (
    <div className={`${styles.rescueRowWrap} ${isOpen ? styles.rescueRowWrapActive : ''}`}>

      {/* ── Compact summary row ─────────────────────────────────────────── */}
      <div
        className={styles.rescueRowSummary}
        onClick={onToggle}
        role="button"
        aria-expanded={isOpen}
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onToggle()}
      >
        {/* Severity bar */}
        <div
          className={`${styles.rescueSeverityBar} ${isDanger ? styles.rescueSeverityBarDanger : styles.rescueSeverityBarWarning}`}
        />

        {/* Info cluster */}
        <div className={styles.rescueRowInfo}>
          <span className={styles.rescueRowId} dir="ltr" style={{ display: 'inline-block' }}>{item.orderId}</span>
          <span className={styles.rescueRowCustomer}>{item.customerName}</span>
          <span className={styles.rescueRowBlocker}>{item.blocker}</span>
        </div>

        {/* Badges + SLA */}
        <div className={styles.rescueRowMeta}>
          <span
            className={`${styles.rescueSeverityBadge} ${isDanger ? styles.rescueSeverityBadgeDanger : styles.rescueSeverityBadgeWarning}`}
          >
            {isDanger ? 'خطر' : 'تحذير'}
          </span>
          <span className={styles.rescueRowSla}>{item.supportHandoff.sla}</span>
          {isOpen && (
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                color: completedSteps === totalDecisionSteps
                  ? 'var(--bthwani-success-text)'
                  : 'var(--bthwani-control-panel-text-muted)',
              }}
            >
              {completedSteps}/{totalDecisionSteps} خطوات
            </span>
          )}
        </div>

        {/* Expand toggle */}
        <button
          type="button"
          className={`${styles.rescueToggleBtn} ${isOpen ? styles.rescueToggleBtnActive : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          aria-label={isOpen ? 'إغلاق' : 'فتح تفاصيل الحالة'}
        >
          ▼
        </button>
      </div>

      {/* ── Accordion body ──────────────────────────────────────────────── */}
      {isOpen && (
        <div className={styles.rescueAccordion}>

          {/* Progress bar */}
          <div style={{
            height: '3px',
            background: 'var(--bthwani-control-panel-border)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              insetInlineStart: 0,
              top: 0,
              bottom: 0,
              width: `${(completedSteps / totalDecisionSteps) * 100}%`,
              background: completedSteps === totalDecisionSteps
                ? 'var(--bthwani-success)'
                : 'var(--bthwani-control-panel-brand)',
              transition: 'width 0.3s ease',
            }} />
          </div>

          {/* ── STEP 1: السبب ─────────────────────────────────────────── */}
          <div className={styles.rescueStep}>
            <div className={styles.rescueStepHeader}>
              <StepNum n="١" />
              <span className={styles.rescueStepTitle}>سبب الإنقاذ</span>
              <span className={styles.rescueStepSelected}>
                {resolveLabel(REASON_LABELS, item.rescueReasonSelector.selectedReason)}
              </span>
            </div>
            <div className={styles.rescueChipGrid}>
              {item.rescueReasonSelector.options.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => onSelectReason(reason)}
                  className={`${styles.rescueChip} ${reason === item.rescueReasonSelector.selectedReason ? styles.rescueChipActive : ''}`}
                >
                  {resolveLabel(REASON_LABELS, reason)}
                </button>
              ))}
            </div>
          </div>

          {/* ── STEP 2: المالك ─────────────────────────────────────────── */}
          <div className={styles.rescueStep}>
            <div className={styles.rescueStepHeader}>
              <StepNum n="٢" />
              <span className={styles.rescueStepTitle}>المالك</span>
              <span className={styles.rescueStepSelected}>
                {resolveLabel(OWNER_LABELS, item.ownerSelection.selectedOwner)}
              </span>
            </div>
            <div className={styles.rescueChipGrid}>
              {item.ownerSelection.options.map((owner) => (
                <button
                  key={owner}
                  type="button"
                  onClick={() => onSelectOwner(owner)}
                  className={`${styles.rescueChip} ${owner === item.ownerSelection.selectedOwner ? styles.rescueChipActive : ''}`}
                >
                  {resolveLabel(OWNER_LABELS, owner)}
                </button>
              ))}
            </div>
          </div>

          {/* ── STEP 3: الإجراء ─────────────────────────────────────────── */}
          <div className={styles.rescueStep}>
            <div className={styles.rescueStepHeader}>
              <StepNum n="٣" />
              <span className={styles.rescueStepTitle}>الإجراء التالي</span>
              <span className={styles.rescueStepSelected}>
                {resolveLabel(ACTION_LABELS, item.nextActionSelector.selectedAction)}
              </span>
            </div>
            <div className={styles.rescueChipGrid}>
              {item.nextActionSelector.options.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => onSelectNextAction(action)}
                  className={`${styles.rescueChip} ${action === item.nextActionSelector.selectedAction ? styles.rescueChipActive : ''}`}
                >
                  {resolveLabel(ACTION_LABELS, action)}
                </button>
              ))}
            </div>
          </div>

          {/* ── STEP 4: الدليل ──────────────────────────────────────────── */}
          <div className={styles.rescueStep}>
            <div className={styles.rescueStepHeader}>
              <StepNum n="٤" />
              <span className={styles.rescueStepTitle}>الدليل والملاحظات</span>
            </div>
            <div className={styles.rescueEvidenceGrid}>
              <div>
                <label className={styles.rescueFieldLabel}>السبب الموثّق</label>
                <input
                  type="text"
                  value={item.requiredEvidence.reason}
                  onChange={(e) => onUpdateEvidence('reason', e.target.value)}
                  className={styles.inspectorInput}
                  placeholder="وصف مختصر للسبب..."
                  dir="rtl"
                />
              </div>
              <div>
                <label className={styles.rescueFieldLabel}>الجهة المتأثرة</label>
                <input
                  type="text"
                  value={item.requiredEvidence.affectedEntity}
                  onChange={(e) => onUpdateEvidence('affectedEntity', e.target.value)}
                  className={styles.inspectorInput}
                  placeholder="مثال: ORD-1102 / payment-failure"
                  dir="ltr"
                />
              </div>
              <div className={styles.rescueEvidenceFieldFull}>
                <label className={styles.rescueFieldLabel}>ملاحظة المشغّل</label>
                <textarea
                  value={item.requiredEvidence.operatorNote}
                  onChange={(e) => onUpdateEvidence('operatorNote', e.target.value)}
                  className={styles.inspectorTextarea}
                  rows={2}
                  placeholder="ما الذي حدث وما الخطوة التالية..."
                  dir="rtl"
                />
              </div>
            </div>
          </div>

          {/* ── Forbidden actions ────────────────────────────────────────── */}
          {item.forbiddenActions.length > 0 && (
            <div className={styles.rescueStep} style={{ padding: '12px 16px' }}>
              <div className={styles.rescueStepHeader}>
                <StepNum n="⚠" muted />
                <span className={styles.rescueStepTitle} style={{ color: 'var(--bthwani-danger-text)' }}>
                  إجراءات ممنوعة في هذه الحالة
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {item.forbiddenActions.map((action) => {
                  const key = `${item.rescueId}-${action}`;
                  const isOverridden = overriddenActions[key];
                  return (
                    <div
                      key={action}
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: isOverridden
                          ? 'color-mix(in srgb, var(--bthwani-warning) 10%, transparent)'
                          : 'color-mix(in srgb, var(--bthwani-danger) 8%, transparent)',
                        border: `1px solid ${isOverridden
                          ? 'color-mix(in srgb, var(--bthwani-warning) 30%, transparent)'
                          : 'color-mix(in srgb, var(--bthwani-danger) 25%, transparent)'}`,
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: '14px', flexShrink: 0 }}>
                        {isOverridden ? '⚠️' : '🚫'}
                      </span>
                      <span style={{
                        flex: 1,
                        fontSize: '12px',
                        fontWeight: 700,
                        color: isOverridden ? 'var(--bthwani-warning-text)' : 'var(--bthwani-danger-text)',
                        textAlign: 'right',
                      }}>
                        {action}
                      </span>
                      <button
                        type="button"
                        onClick={() => onToggleForbidden(action)}
                        style={{
                          flexShrink: 0,
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: '6px',
                          border: `1.5px solid ${isOverridden ? 'var(--bthwani-warning-text)' : 'color-mix(in srgb, var(--bthwani-danger) 50%, transparent)'}`,
                          background: 'transparent',
                          color: isOverridden ? 'var(--bthwani-warning-text)' : 'var(--bthwani-danger-text)',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isOverridden ? 'إلغاء الترخيص' : 'ترخيص استثناءً'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Support handoff ──────────────────────────────────────────── */}
          <div className={styles.rescueStep}>
            <div className={styles.rescueStepHeader}>
              <StepNum n="◎" muted />
              <span className={styles.rescueStepTitle}>تسليم الدعم</span>
            </div>
            <div className={styles.rescueSupportBar}>
              <div className={styles.rescueSupportBarCell}>
                <span className={styles.rescueSupportBarCellLabel}>التذكرة</span>
                <span className={styles.rescueSupportBarCellValue} dir="ltr" style={{ display: 'inline-block' }}>
                  <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{item.supportHandoff.ticketLink}</Text>
                </span>
              </div>
              <div className={styles.rescueSupportBarCell}>
                <span className={styles.rescueSupportBarCellLabel}>SLA المتبقي</span>
                <span className={styles.rescueSupportBarCellValue}>{item.supportHandoff.sla}</span>
              </div>
              <button
                type="button"
                className={styles.rescueSupportNavBtn}
                onClick={() => onNavigate(item.supportHandoff.routeHint)}
                aria-label="فتح مسار الدعم"
              >
                فتح ←
              </button>
            </div>
          </div>

          {/* ── WLT impact ──────────────────────────────────────────────── */}
          <div className={styles.rescueStep}>
            <div className={styles.rescueStepHeader}>
              <StepNum n="◎" muted />
              <span className={styles.rescueStepTitle}>أثر WLT على هذا الطلب</span>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'color-mix(in srgb, var(--bthwani-control-panel-brand) 12%, transparent)',
                color: 'var(--bthwani-control-panel-brand)',
              }}>
                {item.wltImpactVisibility.calculationTruthOwner}
              </span>
            </div>
            <div className={styles.rescueWltRow}>
              {(['paymentVisibility', 'refundVisibility', 'settlementVisibility'] as const).map((fieldKey) => {
                const val = item.wltImpactVisibility[fieldKey];
                if (!val) return null;
                return (
                  <div key={fieldKey} className={styles.rescueWltCell}>
                    <label className={styles.rescueFieldLabel}>{WLT_FIELD_LABELS[fieldKey]}</label>
                    <div style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'color-mix(in srgb, var(--bthwani-control-panel-brand) 8%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--bthwani-control-panel-brand) 20%, transparent)',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--bthwani-control-panel-brand)',
                      textAlign: 'right',
                      direction: 'ltr',
                      cursor: 'default',
                    }}>
                      {val}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Cross-surface links ──────────────────────────────────────── */}
          {item.crossSurfaceLinks.length > 0 && (
            <div className={styles.rescueStep}>
              <div className={styles.rescueStepHeader}>
                <StepNum n="◎" muted />
                <span className={styles.rescueStepTitle}>روابط الأسطح ذات الصلة</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {item.crossSurfaceLinks.map((link) => {
                  const linkLabels: Record<string, string> = {
                    'Customer 360': 'ملف العميل المتكامل',
                    'WLT control': 'تحكم محفظة WLT',
                    'Order rescue': 'إنقاذ الطلبات',
                  };
                  return (
                    <div key={link.actionId} className={styles.rescueLinkItem}>
                      <span className={styles.rescueLinkItemLabel}>
                        {linkLabels[link.label] ?? link.label}
                      </span>
                      <button
                        type="button"
                        className={styles.rescueLinkItemBtn}
                        onClick={() => onNavigate(link.routeHint)}
                      >
                        فتح ←
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Footer: submit ───────────────────────────────────────────── */}
          <div className={styles.rescueAccordionFooter}>
            <button
              type="button"
              className={styles.rescueSubmitBtn}
              onClick={onSubmit}
              style={{
                opacity: completedSteps < totalDecisionSteps ? 0.6 : 1,
              }}
              title={completedSteps < totalDecisionSteps ? 'أكمل خطوات القرار أولاً' : undefined}
            >
              ✓ تأكيد قرار الإنقاذ
            </button>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button
                type="button"
                className={styles.rescueSecondaryBtn}
                onClick={() => onNavigate(`/dsh/operations/command-center?orderId=${item.orderId}`)}
              >
                غرفة القيادة
              </button>
              <button
                type="button"
                className={styles.rescueSecondaryBtn}
                onClick={() => onNavigate(`/dsh/operations/exceptions-escalations`)}
              >
                الاستثناءات
              </button>
            </div>
            {submitNote && (
              <div className={styles.rescueToast} style={{ marginInlineStart: 'auto' }}>
                ✓ {submitNote}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
