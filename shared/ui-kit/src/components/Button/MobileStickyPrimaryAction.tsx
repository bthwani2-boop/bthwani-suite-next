import { colorRoles } from '@bthwani/ui-kit';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from './Button';
import { spacing } from '../../tokens/spacing';

export type MobileStickyPrimaryActionProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export function MobileStickyPrimaryAction({
  label,
  onPress,
  disabled,
}: MobileStickyPrimaryActionProps) {
  return (
    <View style={styles.container}>
      <Button label={label} onPress={onPress} disabled={disabled} tone="primary" fullWidth />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: spacing[4],
    backgroundColor: colorRoles.surfaceBase,
    borderTopWidth: 1,
    borderTopColor: colorRoles.surfaceBase,
  },
});
