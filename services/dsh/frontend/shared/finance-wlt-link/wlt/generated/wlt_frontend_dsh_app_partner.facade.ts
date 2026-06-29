// wlt_frontend_dsh_app_partner.facade.ts
// WLT → DSH bridge: Partner bridge component and navigation
// Authority: This facade exposes WltDshPartnerBridge React component to DSH partner surface.
// Do NOT add business logic here — read-only UI bridge only.

import React from 'react';
import { View, Text, Pressable } from 'react-native';

export type WltDshPartnerBridgeProps = {
  readonly title?: string;
  readonly subtitle?: string;
  readonly onPress?: () => void;
};

export function WltDshPartnerBridge({ title, subtitle, onPress }: WltDshPartnerBridgeProps) {
  return (
    React.createElement(Pressable, { onPress, style: { padding: 16, borderRadius: 12, backgroundColor: '#1a1a2e' } },
      React.createElement(View, null,
        title ? React.createElement(Text, { style: { color: '#e0e0ff', fontWeight: '700', fontSize: 15 } }, title) : null,
        subtitle ? React.createElement(Text, { style: { color: '#9898c8', fontSize: 13, marginTop: 4 } }, subtitle) : null,
      )
    )
  );
}
