// app-field — DshFieldReferenceTag
// Safe display for necessary-but-technical reference values (offline-sync
// operation ids, source/policy ids). Never shown as primary text — always a
// small, muted, human-labeled tag instead of a raw "المرجع المحلي: {id}" string.
import React from 'react';
import { View } from 'react-native';
import { Text, colorRoles, spacing } from '@bthwani/ui-kit';

export type DshFieldReferenceTagProps = {
  readonly label: string;
  readonly value: string;
};

export function DshFieldReferenceTag({ label, value }: DshFieldReferenceTagProps) {
  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: spacing[1],
        alignSelf: 'flex-end',
        paddingHorizontal: spacing[2],
        paddingVertical: 2,
        borderRadius: 999,
        backgroundColor: colorRoles.surfaceMuted,
      }}
    >
      <Text role="caption" tone="muted">{label}:</Text>
      <Text role="code" tone="muted">{value}</Text>
    </View>
  );
}
