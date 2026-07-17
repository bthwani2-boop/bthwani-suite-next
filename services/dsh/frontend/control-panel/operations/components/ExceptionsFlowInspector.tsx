'use client';

import React from 'react';
import { KeyValueList } from '@bthwani/ui-kit';
import { WebControlPanelInspectorShell, WebControlPanelStatusTag } from '@bthwani/ui-kit/web';
import {
  type DshFlowRegistryEntry,
  getDshFlowPolicySummary,
} from '../../../shared/operations/dsh-operational-registry';
import { findDshControlPanelGovernanceSectionByFlowId } from '../../../shared/orders/orders.contract';
import {
  SURFACE_LABELS,
  DOMAIN_LABELS,
  VISIBILITY_LABELS,
  POLICY_LABELS,
} from './ExceptionsEscalations.types';

export type ExceptionsFlowInspectorProps = {
  flow: DshFlowRegistryEntry;
  onClose: () => void;
};

export function ExceptionsFlowInspector({
  flow,
  onClose,
}: ExceptionsFlowInspectorProps) {
  const summary = getDshFlowPolicySummary(flow.id);
  const governance = findDshControlPanelGovernanceSectionByFlowId(flow.id);

  return (
    <WebControlPanelInspectorShell
      title={`سياسة التدفق — ${flow.label}`}
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px', overflowY: 'auto', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 800 }}>الظهور:</span>
          <WebControlPanelStatusTag label={VISIBILITY_LABELS[flow.visibility] ?? flow.visibility} tone="neutral" />
        </div>

        <KeyValueList
          items={[
            { label: 'التدفق', value: flow.label },
            { label: 'السطح المالك', value: SURFACE_LABELS[flow.ownerSurface] ?? flow.ownerSurface },
            { label: 'القسم المالك (حوكمة)', value: governance?.sectionLabel ?? 'عمليات / دعم حسب السياق' },
            { label: 'المجال', value: DOMAIN_LABELS[flow.domain] ?? flow.domain },
            { label: 'سياسة المعاينة', value: POLICY_LABELS[flow.onDemandPolicy] ?? flow.onDemandPolicy },
            { label: 'الأثر المالي', value: flow.financialImpact ? 'نعم (عرض فقط)' : 'لا يوجد' },
          ]}
        />

        {summary && (
          <>
            <div style={{ background: 'var(--bthwani-control-panel-surface-inset)', padding: '8px', borderRadius: '6px' }}>
              <div style={{ fontSize: '10px', color: 'var(--bthwani-control-panel-text-muted)' }}>الإجراءات المسموحة:</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                {summary.allowedActions.map((act) => (
                  <span key={act} style={{ fontSize: '10px', background: 'var(--bthwani-success-surface)', color: 'var(--bthwani-success-text)', padding: '2px 6px', borderRadius: '4px' }}>{act}</span>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--bthwani-control-panel-surface-inset)', padding: '8px', borderRadius: '6px' }}>
              <div style={{ fontSize: '10px', color: 'var(--bthwani-control-panel-text-muted)' }}>الإجراءات الممنوعة:</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                {summary.forbiddenActions.map((act) => (
                  <span key={act} style={{ fontSize: '10px', background: 'var(--bthwani-danger-surface)', color: 'var(--bthwani-danger-text)', padding: '2px 6px', borderRadius: '4px' }}>{act}</span>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--bthwani-control-panel-surface-inset)', padding: '8px', borderRadius: '6px' }}>
              <div style={{ fontSize: '10px', color: 'var(--bthwani-control-panel-text-muted)' }}>معاينة السياسة:</div>
              <div style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text)', marginTop: '2px', fontWeight: 600 }}>{summary.nextPolicyActionPreview}</div>
            </div>
          </>
        )}

        {governance && (
          <div style={{ background: 'var(--bthwani-control-panel-surface-inset)', padding: '8px', borderRadius: '6px' }}>
            <div style={{ fontSize: '10px', color: 'var(--bthwani-control-panel-text-muted)' }}>تعليمات الحوكمة:</div>
            <div style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text)', marginTop: '2px' }}>{governance.notes}</div>
          </div>
        )}
      </div>
    </WebControlPanelInspectorShell>
  );
}
