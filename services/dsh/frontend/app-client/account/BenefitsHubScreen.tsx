// Authority: services/dsh/frontend/app-client — benefits sub-screen.
// Sovereign shared: services/dsh/frontend/shared/marketing
// Sections: loyalty | subscription | offers (3 tabs from MySpaceScreen)
//
// RULE: This file contains ZERO fixture/seed data.
// All data comes from the shared marketing registry (loyalty-subscriptions.types.ts).

import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  Header,
  ScrollScreen,
  StateView,
  Text,
  spacing,
  radius,
  colorRoles,
} from '@bthwani/ui-kit';
import {
  getLoyaltyTiers,
  getSubscriptionPlans,
  buildClientBenefitItems,
  FALLBACK_LOYALTY_ROWS,
  FALLBACK_SUBSCRIPTION_ROWS,
  FALLBACK_OFFERS_ROWS,
} from '../../shared/marketing';
import type { BenefitRow } from '../../shared/marketing';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BenefitsSection = 'loyalty' | 'subscription' | 'offers';

export type BenefitsHubScreenProps = {
  initialSection?: BenefitsSection;
  onBack?: () => void;
  onAction?: (rowId: string, section: BenefitsSection) => void;
};

// ─── Section config (display strings only — no data) ──────────────────────

const SECTION_CONFIG: Record<BenefitsSection, { label: string; subtitle: string }> = {
  loyalty:      { label: 'النقاط والمكافآت',  subtitle: 'مستويات ولائك ومكافآتك المتاحة للاستبدال' },
  subscription: { label: 'الاشتراك',           subtitle: 'خطط الاشتراك المتاحة وخيار التعديل متى احتجت' },
  offers:       { label: 'العروض والكوبونات', subtitle: 'العروض والكوبونات المتاحة لاستخدامها الآن' },
};

// ─── Registry hook (derives rows from shared marketing registry) ──────────

function useRegistryBenefitRows(): Record<BenefitsSection, readonly BenefitRow[]> {
  const derive = () => {
    const tiers = getLoyaltyTiers();
    const plans = getSubscriptionPlans();
    const benefitItems = buildClientBenefitItems(tiers, plans);

    const loyaltyRows: BenefitRow[] = benefitItems
      .filter((b) => b.kind === 'loyalty')
      .map((b) => ({
        id: b.id,
        title: b.title,
        subtitle: b.description,
        badgeLabel: b.badgeLabel ?? 'ولاء',
        badgeTone: 'info' as const,
        helperText: 'مدار من قسم التسويق في لوحة التحكم.',
      }));

    const subRows: BenefitRow[] = benefitItems
      .filter((b) => b.kind === 'subscription')
      .map((b) => ({
        id: b.id,
        title: b.title,
        subtitle: b.description,
        badgeLabel: b.badgeLabel ?? 'اشتراك',
        badgeTone: 'success' as const,
        actionLabel: 'اشترك الآن',
        helperText: 'مدار من قسم التسويق في لوحة التحكم.',
      }));

    return {
      loyalty:      loyaltyRows.length > 0 ? loyaltyRows : FALLBACK_LOYALTY_ROWS,
      subscription: subRows.length > 0 ? subRows : FALLBACK_SUBSCRIPTION_ROWS,
      offers:       FALLBACK_OFFERS_ROWS,
    };
  };

  const [rows, setRows] = React.useState<Record<BenefitsSection, readonly BenefitRow[]>>(derive);

  React.useEffect(() => {
    setRows(derive());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return rows;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BenefitRowCard({
  row,
  section,
  onAction,
}: {
  row: BenefitRow;
  section: BenefitsSection;
  onAction?: ((rowId: string, section: BenefitsSection) => void) | undefined;
}) {
  return (
    <Card style={styles.rowCard}>
      <View style={styles.rowContent}>
        <View style={styles.rowInfo}>
          <View style={styles.rowHeader}>
            <Text role="titleSm" style={styles.rowTitle}>{row.title}</Text>
            {row.badgeLabel && (
              <Badge label={row.badgeLabel} tone={row.badgeTone ?? 'neutral'} />
            )}
          </View>
          <Text role="caption" tone="muted" style={styles.rowSubtitle}>{row.subtitle}</Text>
          {row.helperText && (
            <Text role="caption" style={styles.helperText}>{row.helperText}</Text>
          )}
        </View>
        {row.actionLabel && (
          <Button
            label={row.actionLabel}
            tone="primary"
            onPress={() => onAction?.(row.id, section)}
          />
        )}
      </View>
    </Card>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function BenefitsHubScreen({
  initialSection = 'loyalty',
  onBack,
  onAction,
}: BenefitsHubScreenProps) {
  const [section, setSection] = React.useState<BenefitsSection>(initialSection);
  const config = SECTION_CONFIG[section];
  const sectionData = useRegistryBenefitRows();
  const rows = sectionData[section];

  return (
    <ScrollScreen>
      <Header
        title={config.label}
        subtitle={config.subtitle}
      />

      {/* Section Tabs */}
      <View style={styles.tabBar}>
        {(Object.keys(SECTION_CONFIG) as BenefitsSection[]).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.tab, section === s && styles.tabActive]}
            onPress={() => setSection(s)}
          >
            <Text style={[styles.tabText, section === s && styles.tabTextActive]}>
              {SECTION_CONFIG[s].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Rows */}
      <View style={styles.content}>
        {rows.length === 0 ? (
          <StateView
            tone="neutral"
            title="لا توجد بيانات"
            description="لا توجد معلومات متاحة في هذا القسم حالياً."
          />
        ) : (
          rows.map((row) => (
            <BenefitRowCard
              key={row.id}
              row={row}
              section={section}
              onAction={onAction}
            />
          ))
        )}
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row-reverse',
    backgroundColor: colorRoles.surfaceBase,
    borderBottomWidth: 1,
    borderBottomColor: colorRoles.surfaceBase,
    paddingHorizontal: spacing[4],
  },
  tab: {
    flex: 1,
    paddingVertical: spacing[3],
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colorRoles.brandAction,
  },
  tabText: {
    fontSize: 13,
    color: colorRoles.brandStructure,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabTextActive: {
    color: colorRoles.brandAction,
    fontWeight: '700',
  },
  content: {
    padding: spacing[4],
    gap: spacing[3],
  },
  rowCard: {
    padding: spacing[4],
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colorRoles.surfaceBase,
    marginBottom: spacing[3],
  },
  rowContent: {
    gap: spacing[3],
  },
  rowInfo: {
    gap: spacing[1],
  },
  rowHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[2],
  },
  rowTitle: {
    fontWeight: '700',
    color: colorRoles.brandStructure,
    textAlign: 'right',
    flex: 1,
  },
  rowSubtitle: {
    color: colorRoles.brandStructure,
    textAlign: 'right',
    lineHeight: 20,
  },
  helperText: {
    color: colorRoles.surfaceBase,
    fontSize: 12,
    textAlign: 'right',
    marginTop: 2,
  },
});