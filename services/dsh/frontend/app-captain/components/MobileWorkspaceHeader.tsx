import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Box, Button, Icon, Text, useTheme, colorRoles } from '@bthwani/ui-kit';

export type MobileWorkspaceHeaderProps = {
  title: string;
  description: string;
  icon: string;
  backLabel: string;
  onBack: () => void;
};

export function MobileWorkspaceHeader({
  title,
  description,
  icon,
  backLabel,
  onBack,
}: MobileWorkspaceHeaderProps) {
  const theme = useTheme() as any;

  return (
    <View style={[styles.container, { borderBottomColor: theme.line || colorRoles.surfaceBase, backgroundColor: theme.surfaceRaised || colorRoles.surfaceBase }]}>
      <View style={styles.topRow}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-forward-outline" size={20} color={colorRoles.brandAction} />
          <Text style={[styles.backText, { color: colorRoles.brandAction }]}>{backLabel}</Text>
        </Pressable>
        <Icon name={icon} size={22} color={theme.textMuted || colorRoles.brandStructure} />
      </View>
      <View style={styles.infoCol}>
        <Text role="titleMd">{title}</Text>
        <Text role="bodySm" tone="muted">{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
});
