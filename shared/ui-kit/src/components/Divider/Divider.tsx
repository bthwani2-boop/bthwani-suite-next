import React from 'react';
import { View } from 'react-native';

export type DividerProps = {
  style?: any;
};

export function Divider({ style }: DividerProps) {
  return <View style={[{ height: 1, backgroundColor: '#E2E8F0', marginVertical: 8 }, style]} />;
}
