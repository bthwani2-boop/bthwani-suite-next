'use client';

// Extracted from LiveOrdersScreen — fulfillment-mode queue section and actor label helper.
// Renders the per-mode order queue when a subGroup filter is active.
// No routing here — this is a pure display component for queued orders by mode.

import React from 'react';
import { DSH_FULFILLMENT_OPERATIONAL_MODE_META } from './operations.types';
import type { DshFulfillmentOperationalMode } from './operations.types';

// Actor label for display — derived from fulfillment mode, not from API.
export function getOperationsActorLabel(mode: DshFulfillmentOperationalMode): string {
  if (mode === 'partner_delivery') return 'موصل المتجر';
  if (mode === 'pickup') return 'المتجر';
  return 'الكابتن';
}

import { opsTheme as theme } from '../../shared/operations';

// React.memo — pure display: output is identical for same mode.
export const FulfillmentModeQueueSection = React.memo(function FulfillmentModeQueueSection({ mode }: { mode: DshFulfillmentOperationalMode }) {
  const modeMeta = DSH_FULFILLMENT_OPERATIONAL_MODE_META[mode];
  const rows: { id: (string); storeName: (string); customerName: (string); slaLabel: (string); statusTone: (string); statusLabel: (string); nextAction: (string) }[] = [];

  return (
    <div style={{ marginTop: '16px', direction: 'rtl', textAlign: 'right' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', borderBottom: `1px solid ${theme.line}`, paddingBottom: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '14px', fontWeight: 800, color: theme.text }}>{modeMeta.label}</span>
        <span style={{ fontSize: '11px', color: theme.textMuted, background: theme.surfaceInset, padding: '2px 8px', borderRadius: '6px' }}>
          {modeMeta.operationalOwner}
        </span>
        {modeMeta.requiresCaptain && (
          <span style={{ fontSize: '11px', color: theme.brand, background: theme.brandSurface, padding: '2px 8px', borderRadius: '6px' }}>يتطلب كابتن</span>
        )}
        {modeMeta.requiresPartnerCourier && (
          <span style={{ fontSize: '11px', color: theme.warning, background: theme.warningSurface, padding: '2px 8px', borderRadius: '6px' }}>يتطلب موصل شريك</span>
        )}
        {modeMeta.requiresCustomerPickup && (
          <span style={{ fontSize: '11px', color: theme.success, background: theme.successSurface, padding: '2px 8px', borderRadius: '6px' }}>استلام ذاتي</span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {rows.map((row) => (
          <div key={row.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', border: `1px solid ${theme.line}`, borderRadius: '10px', background: theme.surfaceRaised, gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: '140px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: theme.text }}>#{row.id} — {row.storeName}</span>
              <span style={{ fontSize: '12px', color: theme.textMuted }}>{row.customerName} | {row.slaLabel}</span>
            </div>
            <span style={{
              fontSize: '11px', padding: '3px 10px', borderRadius: '99px', fontWeight: 700,
              background: row.statusTone === 'danger' ? theme.dangerSurface : row.statusTone === 'warning' ? theme.warningSurface : row.statusTone === 'success' ? theme.successSurface : theme.surfaceInset,
              color: row.statusTone === 'danger' ? theme.danger : row.statusTone === 'warning' ? theme.warning : row.statusTone === 'success' ? theme.success : theme.textMuted,
            }}>{row.statusLabel}</span>
            {/* nextAction label is mode-derived — no captain dispatch for partner_delivery or pickup */}
            <button type="button" style={{ padding: '6px 14px', background: theme.brand, color: theme.textInverse, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', whiteSpace: 'nowrap' }}>
              {row.nextAction}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
});
