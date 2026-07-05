'use client';

// P0-09: CP audit trail detail workspace — full audit entry display.
// Shows: actor/role, timestamp, section, decision, reason, evidence,
// related entity, affected surfaces, rollback note, section policy.
// All data is UI preview — no backend binding, no runtime auth.
import React from 'react';
import { Box, KeyValueList, Surface, Text } from '@bthwani/ui-kit';
import {
  WebControlPanelInspectorShell,
} from '@bthwani/ui-kit/web';
import type { DshAuditEntry } from '../../shared/identity-access/dsh-role-permission.model';
import {
  getDshAuditEntryById,
  getDshRoleArabicName,
  getDshRolePermission,
  DSH_AUDIT_ENTRIES,
} from '../../shared/identity-access/dsh-role-permission.model';

export type AuditTrailDetailWorkspaceProps = {
  orderId?: string | undefined;
  /** Look up by entryId; falls back to first preview entry when absent. */
  entryId?: string | undefined;
  /** Pass a resolved entry directly (overrides entryId lookup). */
  auditEntry?: DshAuditEntry | undefined;
  onClose?: (() => void) | undefined;
};

const DECISION_TONE: Record<DshAuditEntry['decision'], 'success' | 'warning' | 'danger'> = {
  approved: 'success',
  rejected: 'danger',
  pending:  'warning',
};

const DECISION_LABEL: Record<DshAuditEntry['decision'], string> = {
  approved: 'معتمد ✓',
  rejected: 'مرفوض ✗',
  pending:  'بانتظار القرار',
};

export function AuditTrailDetailWorkspace({
  orderId = '—',
  entryId,
  auditEntry: auditEntryProp,
  onClose,
}: AuditTrailDetailWorkspaceProps) {
  const entry =
    auditEntryProp ??
    (entryId ? getDshAuditEntryById(entryId) : DSH_AUDIT_ENTRIES[0]);
  const policy = entry ? getDshRolePermission(entry.section) : undefined;

  const shellTitle = entry
    ? `سجل التدقيق — ${entry.relatedEntityLabel ?? orderId}`
    : `سجل التدقيق — ${orderId}`;

  if (!entry) {
    return (
      <WebControlPanelInspectorShell title={shellTitle} onClose={onClose ?? (() => undefined)}>
        <Box gap={4} padding={4}>
          <Text role="bodySm" tone="muted">
            لا يوجد سجل تدقيق مرتبط بهذا الكيان.
          </Text>
        </Box>
      </WebControlPanelInspectorShell>
    );
  }

  const decisionTone = DECISION_TONE[entry.decision];

  return (
    <WebControlPanelInspectorShell title={shellTitle} onClose={onClose ?? (() => undefined)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', overflowY: 'auto', height: '100%', paddingRight: '2px' }}>

        {/* ── Decision banner ── */}
        <Surface tone={decisionTone} padding={3} >
          <Box layoutDirection="row" justify="space-between" align="center" gap={2}>
            <Text role="titleSm" tone="inverse">{DECISION_LABEL[entry.decision]}</Text>
            <Text role="caption" tone="inverse">{entry.timestamp}</Text>
          </Box>
          {entry.rollbackNote ? (
            <Text role="caption" tone="inverse" style={{ marginTop: 6 }}>
              ↩ {entry.rollbackNote}
            </Text>
          ) : null}
        </Surface>

        {/* ── Actor & section ── */}
        {(() => {
          const actionLabels: Record<string, string> = {
            'activate-partner': 'تفعيل الشريك',
            'deactivate-partner': 'إيقاف الشريك',
            'approve-catalog': 'اعتماد الكتالوج',
            'publish-catalog': 'نشر الكتالوج',
            'view-order-cancellation': 'عرض إلغاء الطلب',
            'reassign-dispatch': 'إعادة إسناد الطلب',
            'escalate-support': 'تصعيد الدعم',
            'override-sla': 'تجاوز SLA',
            'view-finance-readonly': 'عرض الأثر المالي',
            'preview-platform-vars': 'معاينة متغيرات المنصة',
            'request-platform-rollback': 'طلب تراجع المنصة',
          };
          const sectionLabels: Record<string, string> = {
            'partner-activation': 'تفعيل الشركاء',
            'partner-deactivation': 'إيقاف الشركاء',
            'catalog-approval': 'اعتماد الكتالوج',
            'catalog-publishing': 'نشر الكتالوج',
            'order-cancellation': 'إلغاء الطلبات',
            'dispatch-reassignment': 'إعادة إسناد التوزيع',
            'support-escalation': 'تصعيد الدعم',
            'sla-override': 'تجاوز SLA',
            'finance-view': 'الرؤية المالية',
            'platform-vars': 'متغيرات المنصة',
          };
          const relatedEntityValue = entry.relatedEntityLabel
            ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span>{entry.relatedEntityLabel}</span>
                <span dir="ltr">({entry.relatedEntityId ?? '—'})</span>
              </span>
            )
            : '—';

          return (
            <KeyValueList
              items={[
                { label: 'المنفّذ',        value: entry.actorName },
                { label: 'الدور',          value: getDshRoleArabicName(entry.actorRoleId) },
                { label: 'القسم',          value: policy?.arabicLabel ?? sectionLabels[entry.section] ?? entry.section },
                { label: 'الإجراء',        value: actionLabels[entry.sensitiveAction] ?? entry.sensitiveAction },
                {
                  label: 'الكيان المرتبط',
                  value: relatedEntityValue as any,
                },
              ]}
            />
          );
        })()}

        {/* ── Reason ── */}
        <Box gap={1}>
          <Text role="titleSm">السبب</Text>
          <Surface tone="inset" padding={3} >
            <Text role="bodySm">{entry.reason}</Text>
          </Surface>
        </Box>

        {/* ── Evidence (conditional) ── */}
        {entry.evidence ? (
          <Box gap={1}>
            <Text role="titleSm">الإثبات / الدليل</Text>
            <Surface tone="inset" padding={3} >
              <Text role="bodySm">{entry.evidence}</Text>
            </Surface>
          </Box>
        ) : null}

        {/* ── Affected surfaces ── */}
        <Box gap={1}>
          <Text role="titleSm">الأسطح المتأثرة</Text>
          <Box layoutDirection="row" gap={2} style={{ flexWrap: 'wrap' }}>
            {entry.affectedSurfaces.map((s) => {
              const surfaceLabels: Record<string, string> = {
                'app-client': 'تطبيق العميل',
                'app-partner': 'تطبيق الشريك',
                'app-captain': 'تطبيق الكابتن',
                'app-field': 'التطبيق الميداني',
                'control-panel': 'لوحة التحكم',
                'wlt-finance': 'المالية WLT',
              };
              return (
                <Surface key={s} tone="raised" padding={1} >
                  <Text role="caption" tone="muted">{surfaceLabels[s] ?? s}</Text>
                </Surface>
              );
            })}
          </Box>
        </Box>

        {/* ── WLT read-only notice ── */}
        {entry.wltReadOnly ? (
          <Surface tone="warning" padding={3} >
            <Text role="bodySm" tone="warning">
              WLT — قراءة فقط: أي إجراء مالي مرتبط بهذا السجل يُنفَّذ في WLT فقط. DSH يعرض ولا يُعدّل.
            </Text>
          </Surface>
        ) : null}

        {/* ── Section policy context ── */}
        {policy ? (
          <Surface tone="inset" padding={3} gap={2} >
            <Text role="caption" tone="muted" weight="bold">سياسة القسم</Text>
            <Text role="bodySm" tone="muted">{policy.arabicDescription}</Text>
            <Box layoutDirection="row" gap={2} style={{ flexWrap: 'wrap' }}>
              {policy.auditRequired ? (
                <Surface tone="warning" padding={1}  borderless>
                  <Text role="caption" tone="muted">تدقيق إلزامي</Text>
                </Surface>
              ) : null}
              {policy.reasonRequired ? (
                <Surface tone="raised" padding={1} >
                  <Text role="caption" tone="muted">سبب مطلوب</Text>
                </Surface>
              ) : null}
              {policy.evidenceRequired ? (
                <Surface tone="raised" padding={1} >
                  <Text role="caption" tone="muted">إثبات مطلوب</Text>
                </Surface>
              ) : null}
              {policy.wltMutationForbidden ? (
                <Surface tone="danger" padding={1}  borderless>
                  <Text role="caption" tone="inverse">تعديل مالي ممنوع</Text>
                </Surface>
              ) : null}
            </Box>
          </Surface>
        ) : null}

      </div>
    </WebControlPanelInspectorShell>
  );
}

export default AuditTrailDetailWorkspace;
