// wlt_frontend_dsh_app_partner.facade.ts
// WLT → DSH bridge: Partner bridge component and navigation
// Authority: This facade exposes WltDshPartnerBridge React component to DSH partner surface.
// Do NOT add business logic here — read-only UI bridge only.

import React from 'react';
import { View, Text, Pressable } from 'react-native';

export type WltDshPartnerBridgeProps = {
  readonly title?: string | undefined;
  readonly subtitle?: string | undefined;
  readonly onPress?: (() => void) | undefined;
  // Read-only display context passed through from the partner hub surface.
  // No business logic here -- these are purely used to render the title/subtitle.
  readonly branchLabel?: string | undefined;
  readonly activeZoneLabel?: string | undefined;
  readonly serviceModes?: readonly { id: string; label: string; description: string; enabled: boolean }[] | undefined;
  readonly onBack?: (() => void) | undefined;
  readonly onOpenExpandedWallet?: (() => void) | undefined;
  readonly onOpenSettlementReview?: (() => void) | undefined;
  readonly onOpenFinancialReport?: (() => void) | undefined;
  readonly dshAuthBearerToken?: string | null | undefined;
  readonly dshClientId?: string | null | undefined;
};

export function WltDshPartnerBridge({
  title,
  subtitle,
  onPress,
  branchLabel,
  activeZoneLabel,
  onBack,
}: WltDshPartnerBridgeProps) {
  const resolvedTitle = title ?? branchLabel;
  const resolvedSubtitle = subtitle ?? activeZoneLabel;
  const resolvedOnPress = onPress ?? onBack;
  return (
    React.createElement(Pressable, { onPress: resolvedOnPress, style: { padding: 16, borderRadius: 12, backgroundColor: '#1a1a2e' } },
      React.createElement(View, null,
        resolvedTitle ? React.createElement(Text, { style: { color: '#e0e0ff', fontWeight: '700', fontSize: 15 } }, resolvedTitle) : null,
        resolvedSubtitle ? React.createElement(Text, { style: { color: '#9898c8', fontSize: 13, marginTop: 4 } }, resolvedSubtitle) : null,
      )
    )
  );
}
