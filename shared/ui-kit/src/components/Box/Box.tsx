import { colorRoles } from '@bthwani/ui-kit';
import React from 'react';
import { View, I18nManager } from 'react-native';
import { spacing } from '../../tokens/spacing';

export type BoxProps = {
  children?: React.ReactNode;
  style?: any;
  padding?: number;
  paddingY?: number;
  paddingX?: number;
  gap?: number;
  background?: string;
  radiusToken?: string;
  border?: boolean;
  borderTone?: string;
  layoutDirection?: 'row' | 'column';
  justify?: string;
  align?: string;
};

export function Box({
  children,
  style,
  padding,
  paddingY,
  paddingX,
  gap,
  background,
  radiusToken,
  border,
  borderTone,
  layoutDirection,
  justify,
  align,
}: BoxProps) {
  const isRTL = I18nManager.isRTL;
  const rowDir = isRTL ? 'row-reverse' : 'row';
  
  const boxStyle: any = {
    flexDirection: layoutDirection === 'row' ? rowDir : 'column',
    gap: gap ? (spacing as any)[gap] || gap * 4 : undefined,
    padding: padding ? (spacing as any)[padding] || padding * 4 : undefined,
    paddingVertical: paddingY ? (spacing as any)[paddingY] || paddingY * 4 : undefined,
    paddingHorizontal: paddingX ? (spacing as any)[paddingX] || paddingX * 4 : undefined,
    backgroundColor: background === 'surfaceInset' ? colorRoles.surfaceBase : background === 'surface' ? colorRoles.surfaceBase : undefined,
    borderRadius: radiusToken === 'md' ? 8 : radiusToken === 'lg' ? 12 : undefined,
    borderWidth: border ? 1 : undefined,
    borderColor: borderTone === 'line' ? colorRoles.surfaceBase : undefined,
    justifyContent: justify === 'space-between' ? 'space-between' : justify,
    alignItems: align === 'center' ? 'center' : align,
  };

  return <View style={[boxStyle, style]}>{children}</View>;
}
