import { colorRoles } from '@bthwani/ui-kit';
import React from 'react';
import { View } from 'react-native';

export type DividerProps = {
  style?: any;
};

export function Divider({ style }: DividerProps) {
  return <View style={[{ height: 1, backgroundColor: colorRoles.surfaceBase, marginVertical: 8 }, style]} />;
}
