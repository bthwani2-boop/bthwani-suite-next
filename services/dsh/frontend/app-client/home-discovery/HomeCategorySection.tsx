import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colorRoles, elevation, radius, spacing } from '@bthwani/ui-kit';
import type { CategoryViewModel } from '../../shared/home-discovery';

type Props = Readonly<{
  categories: CategoryViewModel[];
  activeId?: string | null;
  onCategoryPress?: (id: string) => void;
}>;

const CATEGORY_EMOJIS: Record<string, string> = {
  'cat-restaurant': '🍽️',
  'cat-grocery':    '🛒',
  'cat-pharmacy':   '💊',
  'cat-bakery':     '🥐',
  'cat-default':    '📦',
};

function getEmoji(id: string): string {
  return CATEGORY_EMOJIS[id] ?? '📦';
}

export function HomeCategorySection({ categories, activeId }: Props) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((cat) => {
          const isSelected = activeId != null && cat.id === activeId;
          return (
            <View
              key={cat.id}
              style={styles.categorySelectorCard}
            >
              {/* categoryIconContainer: 56×56, radius.xl, elevation.raised */}
              <View
                style={[
                  styles.categoryIconContainer,
                  isSelected && styles.categoryIconContainerSelected,
                ]}
              >
                <Text style={styles.categoryEmoji}>{getEmoji(cat.id)}</Text>
              </View>

              <View style={styles.categoryNameContainer}>
                <Text
                  style={[styles.categoryName, isSelected && styles.categoryNameSelected]}
                  numberOfLines={2}
                >
                  {cat.label}
                </Text>
              </View>
            </View>
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
    gap: spacing[3],
    alignItems: 'flex-start',
  },

  categorySelectorCard: {
    alignItems: 'center',
    gap: spacing[1],
    width: 72,
  },

  // categoryIconContainer: 56×56, radius.xl (20), surfaceBase bg, elevation.raised
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: radius.xl,
    backgroundColor: colorRoles.surfaceBase,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: colorRoles.borderSubtle,
    ...elevation.raised,
  },
  // selected: brandActionSoft bg, brand border 1.5
  categoryIconContainerSelected: {
    backgroundColor: colorRoles.brandActionSoft,
    borderColor: colorRoles.brandAction,
    borderWidth: 1.5,
  },

  categoryEmoji: {
    fontSize: 26,
  },

  categoryNameContainer: {
    alignItems: 'center',
    minHeight: 18,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: '600',
    color: colorRoles.textSecondary,
    textAlign: 'center',
  },
  categoryNameSelected: {
    color: colorRoles.brandAction,
    fontWeight: '700',
  },
});
