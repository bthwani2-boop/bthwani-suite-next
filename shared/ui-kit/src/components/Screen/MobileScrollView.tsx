import React from 'react';
import { ScrollView } from 'react-native';
import { spacing } from '../../tokens/spacing';

export type MobileScrollViewProps = {
  children?: React.ReactNode;
  fill?: boolean;
  padding?: number;
  gap?: number;
  contentContainerStyle?: any;
};

export function MobileScrollView({
  children,
  fill,
  padding,
  gap,
  contentContainerStyle,
}: MobileScrollViewProps) {
  return (
    <ScrollView
      style={{ flex: fill ? 1 : undefined }}
      contentContainerStyle={[
        {
          padding: padding ? (spacing as any)[padding] || padding * 4 : undefined,
          gap: gap ? (spacing as any)[gap] || gap * 4 : undefined,
        },
        contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  );
}
