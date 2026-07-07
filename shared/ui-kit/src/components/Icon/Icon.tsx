// shared/ui-kit — Icon Component
import React from 'react';
// We import from @expo/vector-icons/Ionicons since the platform runtime is Expo/React Native.
// Direct dependency is bypassed for this specific UI Kit Component.
import Ionicons from '@expo/vector-icons/Ionicons';
import { colorRoles } from '../../tokens';

export type IconProps = {
  name: string;
  size?: number;
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'muted' | 'action';
  color?: string;
  style?: any;
  mirrored?: boolean;
  accessibilityLabel?: string;
};

export function Icon({ name, size = 24, tone, color, style, mirrored, accessibilityLabel, ...props }: IconProps) {
  let resolvedColor = color;
  if (!resolvedColor && tone) {
    if (tone === 'brand' || tone === 'action') resolvedColor = colorRoles.brandAction;
    else if (tone === 'success') resolvedColor = colorRoles.success;
    else if (tone === 'warning') resolvedColor = colorRoles.warning;
    else if (tone === 'danger') resolvedColor = colorRoles.danger;
    else if (tone === 'muted') resolvedColor = colorRoles.textMuted;
  }
  if (!resolvedColor) {
    resolvedColor = colorRoles.textPrimary;
  }

  const transform = mirrored ? [{ scaleX: -1 }] : undefined;

  return (
    <Ionicons
      name={name as any}
      size={size}
      color={resolvedColor}
      style={[transform ? { transform } : null, style]}
      accessibilityLabel={accessibilityLabel}
      {...props}
    />
  );
}

export default Icon;
