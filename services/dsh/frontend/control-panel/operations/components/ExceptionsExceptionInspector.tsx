'use client';

import React from 'react';
import { KeyValueList } from '@bthwani/ui-kit';
import { WebControlPanelInspectorShell, WebControlPanelStatusTag } from '@bthwani/ui-kit/web';
import { EXCEPTION_TICKET_MAP } from '../../../../shared/orders';
import { DSH_CONTROL_PANEL_TONE_MAP } from '../../shared/ControlPanelDshDecisionBoard';
import {
  type ExceptionsStateItem,
  SURFACE_LABELS,
  QUEUE_LABELS,
} from './ExceptionsEscalations.types';

export type ExceptionsExceptionInspectorProps = {
  exc: ExceptionsStateItem;
  actionFeedback: string | null;
  actionStatus: 'idle' | 'pending' | 'success' | 'error';
  activeForm: null | 'escalate' | 'resolve';
  selectedEscalationQueue: string;
  handoffNote: string;
  resolutionNote: string;
  onClose: () => void;
  onSetActiveForm: (form: null | 'escalate' | 'resolve') => void;
  onSetSelectedEscalationQueue: (queue: string) => void;
  onSetHandoffNote: (note: string) => void;
  onSetResolutionNote: (note: string) => void;
  onEscalate: (id: string, targetQueue: string, noteText: string) => void;
  onResolve: (id: string, noteText: string) => void;
  onNavigateToRescue: (routeHint: string) => void;
  onNavigateToAudit: (id: string, isEntryId: boolean) => void;
};

export function ExceptionsExceptionInspector({
  exc,
  actionFeedback,
  actionStatus,
  activeForm,
  selectedEscalationQueue,
  handoffNote,
  resolutionNote,
  onClose,
  onSetActiveForm,
  onSetSelectedEscalationQueue,
  onSetHandoffNote,
  onSetResolutionNote,
  onEscalate,
  onResolve,
  onNavigateToRescue,
  onNavigateToAudit,
}: ExceptionsExceptionInspectorProps) {
  const linkage = EXCEPTION_TICKET_MAP[exc.id];
  const supportTicketId = linkage?.supportTicketId ?? `preview-temp-${exc.id}`;
  const auditEntryId = linkage?.auditEntryId;
  const statusTone = DSH_CONTROL_PANEL_TONE_MAP[exc.customStatusTone] ?? 'neutral';
  const slaStateLabel = exc.customSlaState === 'نشط' ? 'نشط (مفتوح)' : exc.customSlaState === 'مصعّد' ? 'مصعّد (تحت المراجعة)' : 'مستقر (محلول)';

  return (
    <WebControlPanelInspectorShell
      title={`تفاصيل الاستثناء — ${exc.id}`}
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', overflowY: 'auto', flex: 1, direction: 'rtl', textAlign: 'right' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 800 }}>الخطورة:</span>
          <WebControlPanelStatusTag label={exc.severity} tone={statusTone} />
        </div>

        <KeyValueList
          items={[
            { label: 'النوع', value: exc.type },
            { label: 'السطح المتأثر', value: SURFACE_LABELS[exc.affectedSurface] ?? exc.affectedSurface },
            { label: 'طابور المالك', value: QUEUE_LABELS[exc.customQueue]?.label ?? exc.customQueue },
            { label: 'المالك الحالي', value: exc.customOwner },
            { label: 'حالة الـ SLA', value: slaStateLabel },
            { label: 'وقت البدء', value: exc.startTime },
            { label: 'الإجراء الأخير', value: exc.lastAction },
            { label: 'الإجراء المقترح', value: exc.suggestedAction },
            { label: 'تذكرة الدعم المرتبطة', value: supportTicketId },
            { label: 'سجل التدقيق المرتبط', value: auditEntryId ?? 'غير مربوط' },
          ]}
        />

        <div style={{ background: 'var(--bthwani-control-panel-surface-inset)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--bthwani-control-panel-border)' }}>
          <div style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text-muted)', fontWeight: 700 }}>سجل الملاحظات والإجراءات:</div>
          <div style={{ fontSize: '12px', color: 'var(--bthwani-control-panel-text)', marginTop: '4px', lineHeight: 1.5 }}>{exc.customNote}</div>
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
            <span style={{ fontSize: '12px', color: 'var(--bthwani-control-panel-text-muted)' }}>جاري معالجة الإجراء وحفظ التغييرات...</span>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : activeForm === 'escalate' ? (
          <div style={{ background: 'var(--bthwani-control-panel-surface-inset)', border: '1px solid var(--bthwani-control-panel-border)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--bthwani-control-panel-brand)' }}>تصعيد وتعيين المالك الجديد</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label htmlFor="escalation-queue-select" style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text-muted)' }}>طابور التصعيد المستهدف:</label>
              <select
                id="escalation-queue-select"
                value={selectedEscalationQueue}
                onChange={(e) => onSetSelectedEscalationQueue(e.target.value)}
                style={{
                  padding: '8px',
                  fontSize: '12px',
                  background: 'var(--bthwani-control-panel-surface)',
                  color: 'var(--bthwani-control-panel-text)',
                  border: '1px solid var(--bthwani-control-panel-border)',
                  borderRadius: '6px',
                  outline: 'none',
                }}
              >
                {Object.entries(QUEUE_LABELS).map(([key, value]) => (
                  <option key={key} value={key}>{value.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label htmlFor="handoff-note-textarea" style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text-muted)' }}>ملاحظات تسليم الدعم:</label>
              <textarea
                id="handoff-note-textarea"
                rows={3}
                value={handoffNote}
                onChange={(e) => onSetHandoffNote(e.target.value)}
                placeholder="اكتب مبررات التصعيد وتعليمات المتابعة للفريق المستلم..."
                style={{
                  padding: '8px',
                  fontSize: '12px',
                  background: 'var(--bthwani-control-panel-surface)',
                  color: 'var(--bthwani-control-panel-text)',
                  border: '1px solid var(--bthwani-control-panel-border)',
                  borderRadius: '6px',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => onEscalate(exc.id, selectedEscalationQueue, handoffNote)}
                style={{
                  flex: 1,
                  padding: '8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: 'var(--bthwani-control-panel-brand)',
                  color: 'var(--bthwani-brand-contrast)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                تأكيد التصعيد
              </button>
              <button
                type="button"
                onClick={() => onSetActiveForm(null)}
                style={{
                  padding: '8px 16px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: 'transparent',
                  border: '1px solid var(--bthwani-control-panel-border-strong)',
                  color: 'var(--bthwani-control-panel-text)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        ) : activeForm === 'resolve' ? (
          <div style={{ background: 'var(--bthwani-control-panel-surface-inset)', border: '1px solid var(--bthwani-control-panel-border)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--bthwani-control-panel-success)' }}>حل وإغلاق الاستثناء</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label htmlFor="resolution-note-textarea" style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text-muted)' }}>ملاحظات الحل والإغلاق (Resolution Details):</label>
              <textarea
                id="resolution-note-textarea"
                rows={3}
                value={resolutionNote}
                onChange={(e) => onSetResolutionNote(e.target.value)}
                placeholder="اكتب كيفية معالجة الاستثناء والحل النهائي المطبق..."
                style={{
                  padding: '8px',
                  fontSize: '12px',
                  background: 'var(--bthwani-control-panel-surface)',
                  color: 'var(--bthwani-control-panel-text)',
                  border: '1px solid var(--bthwani-control-panel-border)',
                  borderRadius: '6px',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => onResolve(exc.id, resolutionNote)}
                style={{
                  flex: 1,
                  padding: '8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: 'var(--bthwani-control-panel-success)',
                  color: 'var(--bthwani-brand-contrast)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                تأكيد الحل والإغلاق
              </button>
              <button
                type="button"
                onClick={() => onSetActiveForm(null)}
                style={{
                  padding: '8px 16px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: 'transparent',
                  border: '1px solid var(--bthwani-control-panel-border-strong)',
                  color: 'var(--bthwani-control-panel-text)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
            {exc.customSlaState !== 'محلول' ? (
              <>
                <button
                  type="button"
                  onClick={() => onSetActiveForm('resolve')}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--bthwani-control-panel-success)',
                    color: 'var(--bthwani-brand-contrast)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '12px',
                  }}
                >
                  حل وإغلاق الاستثناء (Resolve SLA)
                </button>
                <button
                  type="button"
                  onClick={() => onSetActiveForm('escalate')}
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
                  تصعيد ونقل المالك (Escalate & Transfer)
                </button>
              </>
            ) : (
              <div style={{ background: 'var(--bthwani-success-surface)', border: '1px solid var(--bthwani-control-panel-success)', color: 'var(--bthwani-control-panel-success)', borderRadius: '8px', padding: '12px', fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>
                ✓ تم حل هذا الاستثناء وإغلاق الـ SLA المرتبط بنجاح.
              </div>
            )}

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
                onClick={() => onNavigateToRescue(exc.routeHint)}
              >
                🔗 الانتقال لمسار الحل المساعد
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
                onClick={() => onNavigateToAudit(auditEntryId ? auditEntryId : supportTicketId, !!auditEntryId)}
              >
                {auditEntryId ? 'فتح التدقيق' : 'فتح تذكرة الدعم'}
              </button>
            </div>
          </div>
        )}
      </div>
    </WebControlPanelInspectorShell>
  );
}
