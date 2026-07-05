import { colorRoles } from '../../tokens/colors';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from './Button';
import { Text } from '../Text/Text';
import { spacing } from '../../tokens/spacing';

export type MobileStickyPrimaryActionProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  helperText?: string;
};

export function MobileStickyPrimaryAction({
  label,
  onPress,
  disabled,
  helperText,
}: MobileStickyPrimaryActionProps) {
  return (
    <View style={styles.container}>
      {helperText ? (
        <Text role="caption" tone="muted" align="center" style={styles.helperText}>
          {helperText}
        </Text>
      ) : null}
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
  helperText: {
    marginBottom: spacing[2],
  },
});
