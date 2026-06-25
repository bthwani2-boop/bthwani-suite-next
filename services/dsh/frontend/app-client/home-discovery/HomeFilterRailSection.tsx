import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colorRoles, neutralScale, spacing, radius } from '@bthwani/ui-kit';
import type { DshHomeFilterDto, DiscoveryFilterKind } from '../../shared/home-discovery';

type Props = Readonly<{
  filters: DshHomeFilterDto[];
  activeFilter: DiscoveryFilterKind;
  onFilterChange: (kind: DiscoveryFilterKind) => void;
}>;

/** Maps each filter kind to a leading emoji icon matching the reference design */
const FILTER_ICONS: Record<string, string> = {
  all:       '',
  favorites: '♡',
  nearest:   '📍',
  new:       '✦',
  offers:    '🏷',
};

export function HomeFilterRailSection({ filters, activeFilter, onFilterChange }: Props) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filters.map((filter) => {
          const isActive = filter.kind === activeFilter;
          const icon = FILTER_ICONS[filter.kind] ?? '';
          return (
            <TouchableOpacity
              key={filter.id}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => onFilterChange(filter.kind)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              {icon ? (
                <Text style={[styles.chipIcon, isActive && styles.chipIconActive]}>
                  {icon}
                </Text>
              ) : null}
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    alignItems: 'center',
  },
  chip: {
    height: 36,
    borderRadius: radius.round,
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    backgroundColor: colorRoles.surfaceInset,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
  },
  chipActive: {
    backgroundColor: colorRoles.brandAction,
    borderColor: colorRoles.brandAction,
  },
  chipIcon: {
    fontSize: 13,
    color: colorRoles.textSecondary,
  },
  chipIconActive: {
    color: neutralScale[0],
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colorRoles.textSecondary,
  },
  chipTextActive: {
    color: neutralScale[0],
    fontWeight: '700',
  },
});
