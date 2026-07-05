import React from 'react';
import { Box, Text } from '@bthwani/ui-kit';
import { WebControlActionCard, WebControlDisclosureItem, WebControlPanelKpiStrip, WebSectionCard } from '@bthwani/ui-kit/web';
import { ControlPanelDshDecisionBoard } from './ControlPanelDshDecisionBoard';
import type { DshUnifiedRecommendation } from '../../shared/runtime';
import styles from '../shared/control-panel-surface.module.css';

type WorkspaceSignal = {
  id: string;
  title: string;
  value: string;
  description: string;
  tone?: 'brand' | 'best' | 'warning' | 'danger' | 'success' | 'neutral' | string;
};

type WorkspaceAction = {
  id: string;
  label: string;
  description: string;
  href?: string;
  badge?: string;
  tone?: 'primary' | 'secondary';
  onAction?: () => void;
};

type WorkspaceDisclosure = {
  id: string;
  label: string;
  description: string;
  href?: string;
  badge?: string;
  onAction?: () => void;
};

export type ControlPanelDshWorkspaceFrameProps = {
  eyebrow: string;
  title: string;
  description: string;
  badges?: readonly string[];
  metaItems?: readonly string[];
  primaryAction?: { label: string; href?: string; onAction?: () => void };
  secondaryAction?: { label: string; href?: string; onAction?: () => void };
  signals?: readonly WorkspaceSignal[];
  actions?: readonly WorkspaceAction[];
  disclosures?: readonly WorkspaceDisclosure[];
  decisionBoard?: {
    title: string;
    purpose: string;
    primaryDecision: string;
    nextAction: string;
    blockers: string;
    ownerSurface: string;
    evidenceHint: string;
    routeHint: string;
    decisionTone?: 'brand' | 'best' | 'warning' | 'danger' | 'success' | 'neutral' | string;
    recommendation?: DshUnifiedRecommendation;
  };
  footerNote?: string;
};

export function ControlPanelDshWorkspaceFrame({
  eyebrow,
  title,
  description,
  badges = ['DSH'],
  metaItems = [],
  primaryAction,
  secondaryAction,
  signals = [],
  actions = [],
  disclosures = [],
  decisionBoard,
  footerNote,
}: ControlPanelDshWorkspaceFrameProps) {
  return (
    <div className={styles.surfaceCockpit}>
      <header className={styles.surfaceTopBar}>
        <div className={styles.surfaceTitleBlock}>
          <div className={styles.surfaceHeaderIconBox} aria-hidden="true">
            <div className={styles.surfaceHeaderGlyph}>
              <span className={styles.surfaceHeaderGlyphMinus} />
            </div>
          </div>
          <Box gap={0}>
            <div className={styles.surfaceHeaderTextRow}>
              <h1 className={styles.surfaceHeaderTitle}>{title}</h1>
              <Box paddingX={1} paddingY={0} background="brandSurface" radiusToken="xs">
                <span className={styles.surfaceHeaderBadgeText}>{badges[0] ?? 'DSH'}</span>
              </Box>
            </div>
            <p className={styles.surfaceHeaderSubtitle}>{description}</p>
          </Box>
        </div>

        <div className={styles.surfaceHeaderActions}>
          <div className={styles.surfacePulseCompact}>
            <div className={styles.commandKpi}>
              <span className={styles.commandKpiLabel}>المجال</span>
              <span className={styles.commandKpiValue} style={{ fontSize: '12px' }}>{eyebrow}</span>
            </div>
            <div className={styles.commandKpi}>
              <span className={styles.commandKpiLabel}>الوسوم</span>
              <span className={styles.commandKpiValue}>{badges.length}</span>
            </div>
            <div className={styles.commandKpi}>
              <span className={styles.commandKpiLabel}>المعطيات</span>
              <span className={styles.commandKpiValue}>{metaItems.length}</span>
            </div>
          </div>
        </div>
      </header>

      <WebControlPanelKpiStrip
        items={[
          { id: 'eyebrow', label: 'المساحة', value: eyebrow, tone: 'neutral' },
          { id: 'badges', label: 'الوسوم', value: String(badges.length), tone: 'success' },
          { id: 'meta', label: 'البيانات', value: String(metaItems.length), tone: 'warning' },
        ]}
      />

      {metaItems.length ? (
        <div className={styles.filterDock}>
          {metaItems.map((item) => (
            <span key={item} className={styles.surfaceMetaChip}>
              {item}
            </span>
          ))}
        </div>
      ) : null}

      <main className={styles.surfaceMainPanel}>
        <div className={styles.surfaceInnerScroll}>
          <Box gap={3}>
            {signals.length ? (
              <div className={styles.surfacePulseCompact} style={{ flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                {signals.map((signal) => (
                  <div key={signal.id} className={styles.commandKpi} style={{ flex: 1, minWidth: '140px' }}>
                    <span className={styles.commandKpiLabel}>{signal.title}</span>
                    <div className={styles.commandKpiTrend}>
                      <span className={`${styles.commandKpiValue} ${
                        signal.tone === 'best' || signal.tone === 'success' ? styles.commandKpiValueSuccess :
                        signal.tone === 'warning' ? styles.commandKpiValueAlert :
                        signal.tone === 'danger' ? styles.commandKpiValueDanger : ''
                      }`}>
                        {signal.value}
                      </span>
                      <span className={styles.commandKpiTrendValue} style={{ color: 'var(--bthwani-control-panel-text-muted)', fontWeight: '600' }}>
                        {signal.description}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {decisionBoard ? (
              <ControlPanelDshDecisionBoard
                title={decisionBoard.title}
                purpose={decisionBoard.purpose}
                primaryDecision={decisionBoard.primaryDecision}
                nextAction={decisionBoard.nextAction}
                blockers={decisionBoard.blockers}
                ownerSurface={decisionBoard.ownerSurface}
                evidenceHint={decisionBoard.evidenceHint}
                routeHint={decisionBoard.routeHint}
                {...(decisionBoard.decisionTone !== undefined ? { decisionTone: decisionBoard.decisionTone } : {})}
                {...(decisionBoard.recommendation !== undefined ? { recommendation: decisionBoard.recommendation } : {})}
              />
            ) : null}

            {actions.length ? (
              <WebSectionCard title="الخطوات السريعة" description="حافظ على الواجهة قصيرة وقرارها واضحًا.">
                <Box layoutDirection="row" gap={2} style={{ flexWrap: 'wrap' }}>
                  {actions.map((action) => (
                    <Box key={action.id} style={{ flexGrow: 1, flexBasis: 240 }}>
                      <WebControlActionCard
                        id={action.id}
                        title={action.label}
                        description={action.description}
                        footerLabel={action.badge ?? 'فتح'}
                        {...(action.href !== undefined ? { href: action.href } : {})}
                        {...(action.tone !== undefined ? { tone: action.tone } : {})}
                        {...(action.onAction !== undefined ? { onAction: action.onAction } : {})}
                      />
                    </Box>
                  ))}
                </Box>
              </WebSectionCard>
            ) : null}

            {disclosures.length ? (
              <WebSectionCard title="التفاصيل المتدرجة" description="افتح ما تحتاجه فقط، واترك باقي السطح مطويًا.">
                <Box gap={2}>
                  {disclosures.map((item) => (
                    <WebControlDisclosureItem
                      key={item.id}
                      id={item.id}
                      label={item.label}
                      description={item.description}
                      {...(item.href !== undefined ? { href: item.href } : {})}
                      {...(item.badge !== undefined ? { badge: item.badge } : {})}
                      {...(item.onAction !== undefined ? { onAction: item.onAction } : {})}
                    />
                  ))}
                </Box>
              </WebSectionCard>
            ) : null}

            {footerNote ? <Text role="bodySm" tone="muted">{footerNote}</Text> : null}
          </Box>
        </div>
      </main>
    </div>
  );
}

export default ControlPanelDshWorkspaceFrame;
