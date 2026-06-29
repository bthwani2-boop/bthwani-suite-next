import React from 'react';
import { Box, Text } from '@bthwani/ui-kit';
import { type DshUnifiedRecommendation, getDshRecommendationSeverityLabel } from '../../shared/runtime';
import styles from './control-panel-surface.module.css';

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
    <div className={styles.surfaceCompactPanel}>
      <div className={styles.surfaceSectionHeader}>
        <h3 className={styles.surfacePanelTitle}>{title}</h3>
        <p className={styles.surfaceHeaderSubtitle}>{purpose}</p>
      </div>

      <div className={styles.surfacePulseCompact} style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div className={styles.commandKpi} style={{ flex: 1, minWidth: '180px' }}>
          <span className={styles.commandKpiLabel}>القرار الأساسي</span>
          <span className={`${styles.commandKpiValue} ${styles.commandKpiValueAlert}`}>{primaryDecision}</span>
          <span className={styles.surfaceHeaderSubtitle} style={{ marginTop: '4px' }}>ما الذي يجب أن يحسمه هذا السطح الآن.</span>
        </div>
        <div className={styles.commandKpi} style={{ flex: 1, minWidth: '180px' }}>
          <span className={styles.commandKpiLabel}>الإجراء التالي</span>
          <span className={`${styles.commandKpiValue} ${styles.commandKpiValueSuccess}`}>{nextAction}</span>
          <span className={styles.surfaceHeaderSubtitle} style={{ marginTop: '4px' }}>ما يجب تنفيذه الآن.</span>
        </div>
        <div className={styles.commandKpi} style={{ flex: 1, minWidth: '180px' }}>
          <span className={styles.commandKpiLabel}>العوائق</span>
          <span className={`${styles.commandKpiValue} ${styles.commandKpiValueDanger}`}>{blockers}</span>
          <span className={styles.surfaceHeaderSubtitle} style={{ marginTop: '4px' }}>ما الذي ما زال يمنع الإغلاق أو التنفيذ.</span>
        </div>
        <div className={styles.commandKpi} style={{ flex: 1, minWidth: '180px' }}>
          <span className={styles.commandKpiLabel}>السطح المالك</span>
          <span className={styles.commandKpiValue}>{ownerSurface}</span>
          <span className={styles.surfaceHeaderSubtitle} style={{ marginTop: '4px' }}>السطح المسؤول عن القرار.</span>
        </div>
      </div>

      <div className={styles.surfaceInfoCard} style={{ marginTop: '8px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className={styles.surfaceInfoCardTitle} style={{ color: 'var(--bthwani-brand)' }}>توصية النظام الموحدة</span>
          <span className={styles.surfaceMetaChip} style={{ margin: 0 }}>{getDshRecommendationSeverityLabel(unifiedRecommendation.severity)}</span>
        </div>
        <p className={styles.surfaceInfoCardDescription} style={{ margin: 0, fontSize: '12px', lineHeight: '1.5' }}>
          {`لماذا؟ ${unifiedRecommendation.reason} · ما الدليل؟ ${unifiedRecommendation.evidence} · ما الأثر المتوقع؟ ${unifiedRecommendation.expectedImpact}`}
        </p>
      </div>

      <div className={styles.surfaceMetaWrap} style={{ justifyContent: 'flex-start', marginTop: '4px' }}>
        <div className={styles.surfaceMetaChip}>
          <span>{`الدليل: ${evidenceHint}`}</span>
        </div>
        <div className={styles.surfaceMetaChip}>
          <span>{`المسار: ${routeHint}`}</span>
        </div>
        <div className={styles.surfaceMetaChip}>
          <span>{`المالك: ${unifiedRecommendation.owner}`}</span>
        </div>
      </div>
    </div>
  );
}

export default ControlPanelDshDecisionBoard;
