// Authority: services/dsh/frontend/app-client — benefits sub-screen.
// Sovereign shared: services/dsh/frontend/shared/marketing
// Sections: loyalty | subscription | offers (3 tabs from MySpaceScreen)

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

// ─── Types ────────────────────────────────────────────────────────────────────

export type BenefitsSection = 'loyalty' | 'subscription' | 'offers';

type BenefitRow = {
  id: string;
  title: string;
  subtitle: string;
  badgeLabel?: string;
  badgeTone?: 'success' | 'warning' | 'danger' | 'info' | 'action' | 'neutral';
  actionLabel?: string;
  helperText?: string;
};

export type BenefitsHubScreenProps = {
  initialSection?: BenefitsSection;
  onBack?: () => void;
  onAction?: (rowId: string, section: BenefitsSection) => void;
};

// ─── Seed data (replaced by controller props when backend is wired) ───────────

const SEED_LOYALTY_ROWS: BenefitRow[] = [
  {
    id: 'loyalty-balance',
    title: '٣٢٠ نقطة',
    subtitle: 'مستوى فضي — مكافأتان متاحتان للاستبدال',
    badgeLabel: 'نقاط',
    badgeTone: 'info',
    actionLabel: 'استبدل',
    helperText: 'كل ١٠٠ نقطة تساوي ١ ريال خصم على طلبك القادم.',
  },
  {
    id: 'loyalty-next',
    title: 'المكافأة القادمة',
    subtitle: 'تحتاج ١٨٠ نقطة إضافية للوصول للمستوى الذهبي',
    badgeLabel: 'قريباً',
    badgeTone: 'warning',
    helperText: 'استمر في الطلب للوصول لمزايا المستوى الذهبي.',
  },
];

const SEED_SUBSCRIPTION_ROWS: BenefitRow[] = [
  {
    id: 'sub-current',
    title: 'خطة الأساسية',
    subtitle: '٢٩ ريال / شهرياً — التوصيل المجاني على كل طلب',
    badgeLabel: 'نشط',
    badgeTone: 'success',
    actionLabel: 'إدارة الخطة',
    helperText: 'يتجدد في ١٥ يوليو ٢٠٢٦.',
  },
  {
    id: 'sub-upgrade',
    title: 'خطة المميزة',
    subtitle: '٤٩ ريال / شهرياً — أولوية في التوصيل + ١٠٪ خصم',
    badgeLabel: 'ترقية',
    badgeTone: 'action',
    actionLabel: 'ترقية',
    helperText: 'جرّب مجاناً لمدة ١٤ يوماً.',
  },
];

const SEED_OFFERS_ROWS: BenefitRow[] = [
  {
    id: 'offer-1',
    title: 'خصم ١٥٪ على طلبك القادم',
    subtitle: 'صالح حتى ٣٠ يونيو — يطبق تلقائياً عند الدفع',
    badgeLabel: 'جاهز',
    badgeTone: 'success',
    actionLabel: 'استخدم الآن',
    helperText: 'مقدم من المطعم الذهبي — الطلب الأدنى ٢٥ ريال.',
  },
  {
    id: 'offer-2',
    title: 'توصيل مجاني على ثلاث طلبات',
    subtitle: 'مكافأة ولاء — تنتهي بعد ٧ أيام',
    badgeLabel: 'حصري',
    badgeTone: 'info',
    actionLabel: 'تفعيل',
    helperText: 'لأعضاء المستوى الفضي فما فوق.',
  },
  {
    id: 'offer-3',
    title: 'كوبون خاص بمناسبة رمضان',
    subtitle: 'كود: RAMADAN26 — خصم ٢٠٪ على الحلويات',
    badgeLabel: 'كوبون',
    badgeTone: 'warning',
    actionLabel: 'نسخ الكود',
    helperText: 'يسري حتى نهاية الشهر الكريم.',
  },
];

const SECTION_CONFIG: Record<BenefitsSection, { label: string; subtitle: string }> = {
  loyalty:      { label: 'النقاط والمكافآت',  subtitle: 'رصيدك الحالي ومكافآتك المتاحة للاستبدال' },
  subscription: { label: 'الاشتراك',           subtitle: 'خطتك الحالية وخيار التعديل متى احتجت' },
  offers:       { label: 'العروض والكوبونات', subtitle: 'العروض والكوبونات المتاحة لاستخدامها الآن' },
};

const SECTION_DATA: Record<BenefitsSection, BenefitRow[]> = {
  loyalty: SEED_LOYALTY_ROWS,
  subscription: SEED_SUBSCRIPTION_ROWS,
  offers: SEED_OFFERS_ROWS,
};

// ─── Component ────────────────────────────────────────────────────────────────

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

export function BenefitsHubScreen({
  initialSection = 'loyalty',
  onBack,
  onAction,
}: BenefitsHubScreenProps) {
  const [section, setSection] = React.useState<BenefitsSection>(initialSection);
  const config = SECTION_CONFIG[section];
  const rows = SECTION_DATA[section];

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

// export default BenefitsHubScreen; // Unused default export