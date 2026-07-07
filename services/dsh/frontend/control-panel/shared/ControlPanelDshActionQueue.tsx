import React from 'react';
import {
  WebControlPanelDecisionRow,
  WebControlPanelRecommendation,
} from '@bthwani/ui-kit/web';
import type { DshUnifiedRecommendation } from '../../shared/runtime';
import { DSH_CONTROL_PANEL_TONE_MAP } from '../../shared/runtime';

export type ControlPanelDshActionQueueItem = {
  id: string;
  title: string;
  status: string;
  ownerSurface: string;
  blocker: string;
  evidence: string;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  evidenceActionLabel: string;
  tone?: 'best' | 'warning' | 'danger' | 'brand';
  recommendation?: DshUnifiedRecommendation;
};

export type ControlPanelDshActionQueueProps = {
  title: string;
  purpose: string;
  items: readonly ControlPanelDshActionQueueItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  primaryAction: (item: ControlPanelDshActionQueueItem) => void;
  secondaryAction: (item: ControlPanelDshActionQueueItem) => void;
  evidenceAction: (item: ControlPanelDshActionQueueItem) => void;
  emptyLabel?: string;
};

const QUEUE_HEADER_STYLE: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 0 10px',
  marginBottom: '8px',
  borderBottom: '1px solid var(--bthwani-control-panel-border)',
};

const EMPTY_STYLE: React.CSSProperties = {
  padding: '32px',
  textAlign: 'center',
  backgroundColor: 'var(--bthwani-control-panel-surface)',
  borderRadius: '10px',
  border: '1px solid var(--bthwani-control-panel-border)',
  fontSize: '13px',
  color: 'var(--bthwani-control-panel-text-muted)',
};

export function ControlPanelDshActionQueue({
  title,
  purpose,
  items,
  selectedId,
  onSelect,
  primaryAction,
  secondaryAction,
  evidenceAction,
  emptyLabel = 'لا توجد عناصر حالياً',
}: ControlPanelDshActionQueueProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
      <div style={QUEUE_HEADER_STYLE}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--bthwani-control-panel-text)' }}>{title}</span>
          <span style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text-muted)', fontWeight: 600 }}>{purpose}</span>
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '4px 10px',
            border: '1px solid var(--bthwani-control-panel-border-strong)',
            background: 'var(--bthwani-control-panel-surface)',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--bthwani-control-panel-text)',
            cursor: 'pointer',
          }}
        >
          تحديث
        </button>
      </div>

      {!items.length ? (
        <div style={EMPTY_STYLE}>{emptyLabel}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.map((item) => {
            const tone = DSH_CONTROL_PANEL_TONE_MAP[item.tone ?? 'brand'] ?? 'neutral';
            const isSelected = item.id === selectedId;
            return (
              <div
                key={item.id}
                onClick={() => onSelect(item.id)}
                style={{
                  cursor: 'pointer',
                  outline: isSelected ? '2px solid var(--bthwani-control-panel-border-strong)' : 'none',
                  borderRadius: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <WebControlPanelDecisionRow
                  entityId={item.id}
                  entityLabel={`${item.title} — ${item.ownerSurface}`}
                  status={item.status}
                  statusTone={tone}
                  risk={tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'neutral'}
                  recommendation={item.blocker}
                  reason={item.evidence}
                  primaryAction={{ id: 'primary', label: item.primaryActionLabel, onAction: () => { primaryAction(item); } }}
                  secondaryAction={{ id: 'secondary', label: item.secondaryActionLabel, onAction: () => { secondaryAction(item); } }}
                  onInspect={() => onSelect(item.id)}
                />

                {isSelected && (
                  <WebControlPanelRecommendation
                    title="توصية النظام الموحدة"
                    reason={item.recommendation ? `لماذا؟ ${item.recommendation.reason} · ما الدليل؟ ${item.recommendation.evidence} · ما الأثر المتوقع؟ ${item.recommendation.expectedImpact}` : 'جاهز للتنفيذ بناءً على مراجعة المعايير الآلية.'}
                    confidence={item.recommendation?.confidence ?? 'high'}
                    auditTag={item.recommendation ? `${item.recommendation.owner} · ${item.recommendation.surface}` : 'DSH'}
                    primaryAction={{ id: 'evidence', label: item.evidenceActionLabel, onAction: () => { evidenceAction(item); } }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// export default ControlPanelDshActionQueue; // Unused default export