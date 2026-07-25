import React from 'react';
import {
  CpBadge,
  CpDescriptionList,
  CpDescriptionRow,
  CpMutedInline,
} from '@bthwani/control-panel/components';
import type { CpBadgeTone } from '@bthwani/control-panel/components';

import { type DshControlPanelTone, DSH_CONTROL_PANEL_TONE_MAP } from '../../shared/operations/operations.types';
export type { DshControlPanelTone };
export { DSH_CONTROL_PANEL_TONE_MAP };

export type DshRecommendationSeverity = 'critical' | 'high' | 'medium' | 'low';
export type DshRecommendationConfidence = 'high' | 'medium' | 'low';

export type DshUnifiedRecommendation = {
  id: string;
  surface: string;
  sourceSurface?: string;
  affectedSurface?: string;
  actor?: string;
  lifecycleStep?: string;
  entityId?: string;
  entityLabel?: string;
  status?: string;
  risk?: string;
  severity: DshRecommendationSeverity;
  confidence: DshRecommendationConfidence;
  affectedEntity: string;
  reason: string;
  evidence: string;
  nextAction: string;
  owner: string;
  expectedImpact: string;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  counterpartRouteHint?: string;
  runtimeBindingStatus?: string;
  counterpartLinks?: readonly unknown[];
};

export function getDshRecommendationSeverityLabel(severity: DshRecommendationSeverity): string {
  if (severity === 'critical') return 'حرج';
  if (severity === 'high') return 'مرتفع';
  if (severity === 'medium') return 'متوسط';
  return 'منخفض';
}

function severityToBadgeTone(severity: DshRecommendationSeverity): CpBadgeTone {
  if (severity === 'critical' || severity === 'high') return 'danger';
  if (severity === 'medium') return 'warning';
  return 'neutral';
}

/**
 * Resolves a UI tone from an order's backend runtime status string.
 * Matches status values from DshOrderRecord (dsh-order-lifecycle-client.ts).
 */
export function resolveRuntimeOrderStatusTone(status: string): DshControlPanelTone {
  const normalized = status.toLowerCase();
  if (normalized === 'cancelled' || normalized === 'failed_delivery') return 'danger';
  if (normalized === 'pending' || normalized === 'created' || normalized === 'returning_to_store') return 'warning';
  if (normalized === 'delivered' || normalized === 'returned') return 'success';
  return 'neutral';
}

export type ControlPanelDshDecisionBoardProps = {
  title: string;
  purpose: string;
  primaryDecision: string;
  nextAction: string;
  blockers: string;
  ownerSurface: string;
  evidenceHint: string;
  routeHint: string;
  decisionTone?: string;
  recommendation?: DshUnifiedRecommendation;
};

export function ControlPanelDshDecisionBoard({
  title,
  purpose,
  primaryDecision,
  nextAction,
  blockers,
  ownerSurface,
  evidenceHint,
  routeHint,
  decisionTone = 'brand',
  recommendation,
}: ControlPanelDshDecisionBoardProps) {
  const unifiedRecommendation = recommendation ?? {
    id: `${ownerSurface}-${title}`,
    surface: ownerSurface,
    severity: decisionTone === 'danger' ? 'high' : decisionTone === 'warning' ? 'medium' : 'low',
    confidence: 'high',
    affectedEntity: ownerSurface,
    reason: blockers,
    evidence: evidenceHint,
    nextAction,
    owner: ownerSurface,
    expectedImpact: purpose,
    primaryActionLabel: 'تنفيذ الآن',
    secondaryActionLabel: 'فتح الأدلة',
  };

  return (
    <section aria-label={title}>
      <header>
        <strong>{title}</strong>
        <CpMutedInline tight>{purpose}</CpMutedInline>
      </header>

      <CpDescriptionList>
        <CpDescriptionRow label="القرار الأساسي">{primaryDecision}</CpDescriptionRow>
        <CpDescriptionRow label="الإجراء التالي">{nextAction}</CpDescriptionRow>
        <CpDescriptionRow label="العوائق">{blockers}</CpDescriptionRow>
        <CpDescriptionRow label="السطح المالك">{ownerSurface}</CpDescriptionRow>
      </CpDescriptionList>

      <div>
        <CpBadge tone={severityToBadgeTone(unifiedRecommendation.severity)}>
          {getDshRecommendationSeverityLabel(unifiedRecommendation.severity)}
        </CpBadge>
        <CpMutedInline>{'توصية النظام الموحدة'}</CpMutedInline>
        <p>
          {`لماذا؟ ${unifiedRecommendation.reason} · ما الدليل؟ ${unifiedRecommendation.evidence} · ما الأثر المتوقع؟ ${unifiedRecommendation.expectedImpact}`}
        </p>
      </div>

      <CpDescriptionList>
        <CpDescriptionRow label="الدليل">{evidenceHint}</CpDescriptionRow>
        <CpDescriptionRow label="المسار">{routeHint}</CpDescriptionRow>
        <CpDescriptionRow label="المالك">{unifiedRecommendation.owner}</CpDescriptionRow>
      </CpDescriptionList>
    </section>
  );
}

// export default ControlPanelDshDecisionBoard; // Unused default export
