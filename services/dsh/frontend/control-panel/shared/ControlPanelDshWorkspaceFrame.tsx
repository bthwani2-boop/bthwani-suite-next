import React from 'react';
import { Box, Text } from '@bthwani/ui-kit';
import { WebControlActionCard, WebControlDisclosureItem, WebSectionCard } from '@bthwani/ui-kit/web';
import {
  CpBadge,
  CpDescriptionList,
  CpDescriptionRow,
  CpKpiCard,
  CpKpiStrip,
  CpMutedInline,
  CpPageHeader,
} from '@bthwani/control-panel/components';
import type { CpBadgeTone } from '@bthwani/control-panel/components';
import { useCpFrameTokens } from '@bthwani/control-panel/shell';
import { ControlPanelDshDecisionBoard, type DshUnifiedRecommendation } from './ControlPanelDshDecisionBoard';

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

function toBadgeTone(tone: string | undefined): CpBadgeTone {
  if (tone === 'best') return 'success';
  if (
    tone === 'brand' ||
    tone === 'promo' ||
    tone === 'premium' ||
    tone === 'success' ||
    tone === 'warning' ||
    tone === 'danger' ||
    tone === 'info' ||
    tone === 'neutral'
  ) {
    return tone;
  }
  return 'neutral';
}

/**
 * Generic reusable DSH workspace layout — despite living in `shared/`, this
 * is a frame-like scaffold (eyebrow/title/description header, KPI strip,
 * decision-board slot, quick-actions + disclosures sections) meant to be
 * reused by multiple DSH control-panel screens. Page/panel backgrounds are
 * wired to the shared appearance tokens via `useCpFrameTokens()`, the same
 * hook `shell/*Frame.tsx` uses, so this recolors with the rest of the shell
 * under lightPremium/darkGlass without any local stylesheet.
 */
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
  const frameTokens = useCpFrameTokens();

  return (
    <div style={frameTokens.page}>
      <CpPageHeader title={title}>
        <Box layoutDirection="row" gap={2} align="center">
          <CpBadge tone="brand">{badges[0] ?? 'DSH'}</CpBadge>
          <CpMutedInline tight>{description}</CpMutedInline>
        </Box>
      </CpPageHeader>

      <CpKpiStrip>
        <CpKpiCard label="المجال" value={eyebrow} />
        <CpKpiCard label="الوسوم" value={badges.length} />
        <CpKpiCard label="المعطيات" value={metaItems.length} />
      </CpKpiStrip>

      {metaItems.length ? (
        <Box layoutDirection="row" gap={2} style={{ flexWrap: 'wrap' }}>
          {metaItems.map((item) => (
            <CpBadge key={item} tone="neutral">
              {item}
            </CpBadge>
          ))}
        </Box>
      ) : null}

      <div style={frameTokens.panelStart}>
        <Box gap={3}>
          {signals.length ? (
            <CpDescriptionList>
              {signals.map((signal) => (
                <CpDescriptionRow key={signal.id} label={signal.title}>
                  <Box layoutDirection="row" gap={2} align="center">
                    <CpBadge tone={toBadgeTone(signal.tone)}>{signal.value}</CpBadge>
                    <CpMutedInline tight>{signal.description}</CpMutedInline>
                  </Box>
                </CpDescriptionRow>
              ))}
            </CpDescriptionList>
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
    </div>
  );
}

// export default ControlPanelDshWorkspaceFrame; // Unused default export
