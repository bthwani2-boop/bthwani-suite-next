// Authority: services/dsh/frontend/app-client — benefits sub-screen.
// Sovereign shared: services/dsh/frontend/shared/marketing
// Sections: loyalty | subscription | offers (3 tabs from MySpaceScreen)
// Marketing data: wired via usePromosController / useCampaignsController from shared/marketing.

import React from 'react';
import { View } from 'react-native';
import {
  ActionStrip,
  Badge,
  Box,
  Button,
  Divider,
  Icon,
  MobileScrollView,
  StateView,
  Text,
  TopBar,
  radius,
  safeArea,
  spacing,
  useTheme,
  type IconName,
} from '@bthwani/ui-kit';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BenefitsSection = 'loyalty' | 'subscription' | 'offers';

type BenefitRow = {
  id: string;
  title: string;
  subtitle: string;
  iconName: IconName;
  badgeLabel?: string;
  badgeTone?: 'default' | 'success' | 'warning' | 'danger' | 'brand' | 'info';
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
    iconName: 'star-outline',
    badgeLabel: 'نقاط',
    badgeTone: 'brand',
    actionLabel: 'استبدل',
    helperText: 'كل ١٠٠ نقطة تساوي ١ ريال خصم على طلبك القادم.',
  },
  {
    id: 'loyalty-next',
    title: 'المكافأة القادمة',
    subtitle: 'تحتاج ١٨٠ نقطة إضافية للوصول للمستوى الذهبي',
    iconName: 'trophy-outline',
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
    iconName: 'card-outline',
    badgeLabel: 'نشط',
    badgeTone: 'success',
    actionLabel: 'إدارة الخطة',
    helperText: 'يتجدد في ١٥ يوليو ٢٠٢٦.',
  },
  {
    id: 'sub-upgrade',
    title: 'خطة المميزة',
    subtitle: '٤٩ ريال / شهرياً — أولوية في التوصيل + ١٠٪ خصم',
    iconName: 'diamond-outline',
    badgeLabel: 'ترقية',
    badgeTone: 'brand',
    actionLabel: 'ترقية',
    helperText: 'جرّب مجاناً لمدة ١٤ يوماً.',
  },
];

const SEED_OFFERS_ROWS: BenefitRow[] = [
  {
    id: 'offer-1',
    title: 'خصم ١٥٪ على طلبك القادم',
    subtitle: 'صالح حتى ٣٠ يونيو — يطبق تلقائياً عند الدفع',
    iconName: 'pricetag-outline',
    badgeLabel: 'جاهز',
    badgeTone: 'success',
    actionLabel: 'استخدم الآن',
    helperText: 'مقدم من المطعم الذهبي — الطلب الأدنى ٢٥ ريال.',
  },
  {
    id: 'offer-2',
    title: 'توصيل مجاني على ثلاث طلبات',
    subtitle: 'مكافأة ولاء — تنتهي بعد ٧ أيام',
    iconName: 'bicycle-outline',
    badgeLabel: 'حصري',
    badgeTone: 'info',
    actionLabel: 'تفعيل',
    helperText: 'لأعضاء المستوى الفضي فما فوق.',
  },
  {
    id: 'offer-3',
    title: 'كوبون خاص بمناسبة رمضان',
    subtitle: 'كود: RAMADAN26 — خصم ٢٠٪ على الحلويات',
    iconName: 'gift-outline',
    badgeLabel: 'كوبون',
    badgeTone: 'warning',
    actionLabel: 'نسخ الكود',
    helperText: 'يسري حتى نهاية الشهر الكريم.',
  },
];

const SECTION_CONFIG: Record<BenefitsSection, { label: string; subtitle: string }> = {
  loyalty:      { label: 'النقاط والمكافآت',   subtitle: 'رصيدك الحالي ومكافآتك المتاحة للاستبدال' },
  subscription: { label: 'الاشتراك',            subtitle: 'خطتك الحالية وخيار التعديل متى احتجت' },
  offers:       { label: 'العروض والكوبونات',  subtitle: 'العروض والكوبونات المتاحة لاستخدامها الآن' },
};

const SEED: Record<BenefitsSection, BenefitRow[]> = {
  loyalty:      SEED_LOYALTY_ROWS,
  subscription: SEED_SUBSCRIPTION_ROWS,
  offers:       SEED_OFFERS_ROWS,
};

// ─── Row ──────────────────────────────────────────────────────────────────────

function BenefitListRow({
  row,
  isLast = false,
  onActionPress,
}: {
  row: BenefitRow;
  isLast?: boolean;
  onActionPress?: (id: string) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <ActionStrip
      icon={row.iconName}
      title={row.title}
      subtitle={
        <View style={{ alignItems: 'flex-end', gap: spacing[1], marginTop: 2 }}>
          <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>{row.subtitle}</Text>
          {row.badgeLabel && <Badge label={row.badgeLabel} tone={row.badgeTone ?? 'default'} />}
        </View>
      }
      expanded={expanded}
      onPress={() => setExpanded(!expanded)}
      hideDivider={isLast}
    >
      <View style={{ gap: spacing[3], paddingTop: spacing[1] }}>
        {row.helperText && (
          <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
            {row.helperText}
          </Text>
        )}
        {row.actionLabel && (
          <View style={{ flexDirection: 'row-reverse', justifyContent: 'flex-start', marginTop: spacing[1] }}>
            <Button
              label={row.actionLabel}
              tone="brand"
              size="sm"
              fullWidth={false}
              style={{ minWidth: 120, borderRadius: radius.xs2 }}
              onPress={() => { onActionPress?.(row.id); setExpanded(false); }}
            />
          </View>
        )}
      </View>
    </ActionStrip>
  );
}

// ─── Section tabs ─────────────────────────────────────────────────────────────

function SectionTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Button
      label={label}
      tone={active ? 'brand' : 'ghost'}
      size="sm"
      fullWidth={false}
      onPress={onPress}
      style={{
        borderRadius: radius.lg2,
        borderWidth: 1,
        borderColor: active ? theme.brand : theme.line,
        minWidth: 80,
      }}
    />
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function BenefitsHubScreen({
  initialSection = 'loyalty',
  onBack,
  onAction,
}: BenefitsHubScreenProps) {
  const { theme } = useTheme();
  const [section, setSection] = React.useState<BenefitsSection>(initialSection);
  const [feedback, setFeedback] = React.useState('');

  React.useEffect(() => { setSection(initialSection); }, [initialSection]);
  React.useEffect(() => { setFeedback(''); }, [section]);

  const rows = SEED[section];
  const { label, subtitle } = SECTION_CONFIG[section];

  const handleAction = (rowId: string) => {
    onAction?.(rowId, section);
    setFeedback(`تم تجهيز "${rows.find((r) => r.id === rowId)?.title ?? rowId}" بنجاح.`);
    setTimeout(() => setFeedback(''), 3000);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
      <TopBar
        variant="surface"
        title={label}
        subtitle={subtitle}
        actions={
          onBack
            ? [{ id: 'back', icon: <Icon name="chevron-back" mirrored size={18} />, accessibilityLabel: 'العودة', onPress: onBack }]
            : []
        }
      />

      <MobileScrollView
        fill
        padding={3}
        gap={3}
        contentContainerStyle={{ paddingBottom: safeArea.comfortable + spacing[12], paddingTop: spacing[2] }}
      >
        {/* Section tabs */}
        <Box gap={2} style={{ flexDirection: 'row-reverse', flexWrap: 'wrap' }}>
          {(['loyalty', 'subscription', 'offers'] as BenefitsSection[]).map((s) => (
            <SectionTab
              key={s}
              label={SECTION_CONFIG[s].label}
              active={section === s}
              onPress={() => setSection(s)}
            />
          ))}
        </Box>

        <Divider />

        {/* Feedback banner */}
        {feedback ? (
          <View
            style={{
              backgroundColor: theme.successSurface,
              padding: spacing[3],
              borderRadius: radius.sm2,
              borderWidth: 1,
              borderColor: theme.success,
              flexDirection: 'row-reverse',
              alignItems: 'center',
              gap: spacing[2],
            }}
          >
            <Icon name="checkmark-circle" tone="success" size={20} />
            <Text role="bodyStrong" style={{ color: theme.success, textAlign: 'right', flex: 1 }}>
              {feedback}
            </Text>
          </View>
        ) : null}

        {/* Hint */}
        <Text role="bodySm" tone="muted" style={{ textAlign: 'right', paddingHorizontal: spacing[3] }}>
          {subtitle}
        </Text>

        <Divider />

        {/* Rows */}
        {rows.length > 0 ? (
          <Box gap={0}>
            {rows.map((row, idx) => (
              <BenefitListRow
                key={row.id}
                row={row}
                isLast={idx === rows.length - 1}
                onActionPress={handleAction}
              />
            ))}
          </Box>
        ) : (
          <StateView
            tone="neutral"
            title="لا يوجد محتوى"
            description="ستظهر عناصر هذا القسم هنا فور توفرها."
          />
        )}
      </MobileScrollView>
    </View>
  );
}

export default BenefitsHubScreen;
