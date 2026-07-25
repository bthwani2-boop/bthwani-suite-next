'use client';

import React from 'react';
import { Box, Button, KeyValueList, StateView, Text } from '@bthwani/ui-kit';
import { WebControlPanelInspectorShell, WebControlPanelStatusTag } from '@bthwani/ui-kit/web';
import { EXCEPTION_TICKET_MAP } from '../../../shared/orders';
import { DSH_CONTROL_PANEL_TONE_MAP } from '../../shared/ControlPanelDshDecisionBoard';
import {
  type ExceptionsStateItem,
  SURFACE_LABELS,
  QUEUE_LABELS,
} from './ExceptionsEscalations.types';
import styles from '../../shared/control-panel-surface.module.css';

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
  const resolved = exc.customSlaState === 'محلول';

  return (
    <WebControlPanelInspectorShell
      title={`تفاصيل الاستثناء — ${exc.id}`}
      onClose={onClose}
    >
      <Box gap={4} padding={4} style={{ overflowY: 'auto', flex: 1 }}>
        <Box layoutDirection="row" justify="space-between" align="center">
          <Text role="label">الخطورة:</Text>
          <WebControlPanelStatusTag label={exc.severity} tone={statusTone} />
        </Box>

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

        <Box gap={1} padding={3} background="surfaceInset" radiusToken="md">
          <Text role="caption" tone="muted">سجل الملاحظات والإجراءات:</Text>
          <Text role="bodySm">{exc.customNote}</Text>
        </Box>

        {actionFeedback ? (
          <Box padding={3} background="surfaceInset" radiusToken="md">
            <Text role="bodySm" tone="brand">{actionFeedback}</Text>
          </Box>
        ) : null}

        {actionStatus === 'pending' ? (
          <StateView stateId="loading" title="جاري معالجة الإجراء وحفظ التغييرات..." />
        ) : activeForm === 'escalate' ? (
          <Box gap={2} padding={3} background="surfaceInset" radiusToken="md">
            <Text role="bodyStrong" tone="brand">تصعيد وتعيين المالك الجديد</Text>

            <Box gap={1}>
              <Text role="caption" tone="muted">طابور التصعيد المستهدف:</Text>
              <select
                id="escalation-queue-select"
                aria-label="طابور التصعيد المستهدف"
                className={styles.inspectorSelect}
                value={selectedEscalationQueue}
                onChange={(e) => onSetSelectedEscalationQueue(e.target.value)}
              >
                {Object.entries(QUEUE_LABELS).map(([key, value]) => (
                  <option key={key} value={key}>{value.label}</option>
                ))}
              </select>
            </Box>

            <Box gap={1}>
              <Text role="caption" tone="muted">ملاحظات تسليم الدعم:</Text>
              <textarea
                id="handoff-note-textarea"
                aria-label="ملاحظات تسليم الدعم"
                rows={3}
                className={styles.inspectorTextarea}
                value={handoffNote}
                onChange={(e) => onSetHandoffNote(e.target.value)}
                placeholder="اكتب مبررات التصعيد وتعليمات المتابعة للفريق المستلم..."
              />
            </Box>

            <Box layoutDirection="row" gap={2}>
              <Button
                label="تأكيد التصعيد"
                tone="brand"
                fullWidth
                onPress={() => onEscalate(exc.id, selectedEscalationQueue, handoffNote)}
              />
              <Button label="إلغاء" tone="secondary" onPress={() => onSetActiveForm(null)} />
            </Box>
          </Box>
        ) : activeForm === 'resolve' ? (
          <Box gap={2} padding={3} background="surfaceInset" radiusToken="md">
            <Text role="bodyStrong" tone="success">حل وإغلاق الاستثناء</Text>

            <Box gap={1}>
              <Text role="caption" tone="muted">ملاحظات الحل والإغلاق (Resolution Details):</Text>
              <textarea
                id="resolution-note-textarea"
                aria-label="ملاحظات الحل والإغلاق"
                rows={3}
                className={styles.inspectorTextarea}
                value={resolutionNote}
                onChange={(e) => onSetResolutionNote(e.target.value)}
                placeholder="اكتب كيفية معالجة الاستثناء والحل النهائي المطبق..."
              />
            </Box>

            <Box layoutDirection="row" gap={2}>
              <Button
                label="تأكيد الحل والإغلاق"
                tone="success"
                fullWidth
                onPress={() => onResolve(exc.id, resolutionNote)}
              />
              <Button label="إلغاء" tone="secondary" onPress={() => onSetActiveForm(null)} />
            </Box>
          </Box>
        ) : (
          <Box gap={2} style={{ marginTop: 'auto' }}>
            {!resolved ? (
              <>
                <Button
                  label="حل وإغلاق الاستثناء (Resolve SLA)"
                  tone="success"
                  fullWidth
                  onPress={() => onSetActiveForm('resolve')}
                />
                <Button
                  label="تصعيد ونقل المالك (Escalate & Transfer)"
                  tone="brand"
                  fullWidth
                  onPress={() => onSetActiveForm('escalate')}
                />
              </>
            ) : (
              <Box padding={3} background="surfaceInset" radiusToken="md">
                <Text role="bodySm" tone="success">تم حل هذا الاستثناء وإغلاق الـ SLA المرتبط بنجاح.</Text>
              </Box>
            )}

            <Box layoutDirection="row" gap={2}>
              <Button
                label="الانتقال لمسار الحل المساعد"
                tone="secondary"
                fullWidth
                onPress={() => onNavigateToRescue(exc.routeHint)}
              />
              <Button
                label={auditEntryId ? 'فتح التدقيق' : 'فتح تذكرة الدعم'}
                tone="secondary"
                fullWidth
                onPress={() => onNavigateToAudit(auditEntryId ? auditEntryId : supportTicketId, !!auditEntryId)}
              />
            </Box>
          </Box>
        )}
      </Box>
    </WebControlPanelInspectorShell>
  );
}
