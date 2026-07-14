// Loyalty & Subscriptions types — Control Panel + Client App shared types.
// Authority: dsh/frontend/shared/marketing — no JSX, no ui-kit.

// ─── Loyalty Program ───────────────────────────────────────────────────────

export type LoyaltyTierStatus = 'draft' | 'active' | 'paused' | 'archived';

export type LoyaltyTierRecord = {
  readonly id: string;
  readonly nameAr: string;
  readonly nameEn: string;
  /** Minimum points to enter this tier */
  readonly minPoints: number;
  /** Discount % applied to orders while in this tier */
  readonly discountPercent: number;
  /** Free delivery threshold override (0 = not offered) */
  readonly freeDeliveryThreshold: number;
  readonly badge: string;
  readonly status: LoyaltyTierStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type LoyaltyProgramSummary = {
  readonly activeTiers: number;
  readonly totalEnrolledClients: number;
  readonly pointsIssuedThisMonth: number;
  readonly isBackedByApi: boolean;
};

// ─── Subscriptions ─────────────────────────────────────────────────────────

export type SubscriptionPlanStatus = 'draft' | 'active' | 'paused' | 'archived';
export type SubscriptionBillingCycle = 'monthly' | 'quarterly' | 'annual';

export type SubscriptionPlanRecord = {
  readonly id: string;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly priceYer: number;
  readonly billingCycle: SubscriptionBillingCycle;
  /** Free delivery on every order included */
  readonly includeFreeDelivery: boolean;
  /** Loyalty points multiplier (1 = standard, 2 = double) */
  readonly pointsMultiplier: number;
  /** Max orders per billing cycle (0 = unlimited) */
  readonly orderCap: number;
  readonly badge: string;
  readonly status: SubscriptionPlanStatus;
  readonly subscriberCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type SubscriptionsSummary = {
  readonly activePlans: number;
  readonly totalActiveSubscribers: number;
  readonly mrr: number;
  readonly isBackedByApi: boolean;
};

// ─── Client App — Benefits Hub view model ──────────────────────────────────

export type ClientBenefitItem = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly kind: 'loyalty' | 'subscription' | 'promo';
  readonly badgeLabel?: string;
};

export function buildClientBenefitItems(
  tiers: readonly LoyaltyTierRecord[],
  plans: readonly SubscriptionPlanRecord[],
): readonly ClientBenefitItem[] {
  const tierItems: ClientBenefitItem[] = tiers
    .filter((t) => t.status === 'active')
    .map((t) => ({
      id: `tier-${t.id}`,
      title: t.nameAr,
      description: `خصم ${t.discountPercent}% على كل طلب — ابدأ من ${t.minPoints.toLocaleString('ar')} نقطة`,
      icon: t.badge || '⭐',
      kind: 'loyalty' as const,
      badgeLabel: 'ولاء',
    }));

  const planItems: ClientBenefitItem[] = plans
    .filter((p) => p.status === 'active')
    .map((p) => ({
      id: `plan-${p.id}`,
      title: p.nameAr,
      description: `${p.priceYer.toLocaleString('ar')} ريال / ${p.billingCycle === 'monthly' ? 'شهر' : p.billingCycle === 'quarterly' ? 'ربع سنة' : 'سنة'}`,
      icon: p.badge || '🎟',
      kind: 'subscription' as const,
      badgeLabel: 'اشتراك',
    }));

  return [...tierItems, ...planItems];
}

// ─── BenefitRow: client-app display unit ──────────────────────────────────
// Defined here (not in screen files) so screens contain zero fixture data.

export type BenefitRowTone = 'success' | 'warning' | 'danger' | 'info' | 'action' | 'neutral';

export type BenefitRow = {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly badgeLabel?: string;
  readonly badgeTone?: BenefitRowTone;
  readonly actionLabel?: string;
  readonly helperText?: string;
};

// ─── Fallback rows (used when the registry has no active items yet) ───────
// All fixture/seed data lives HERE — never in screen or component files.

export const FALLBACK_LOYALTY_ROWS: readonly BenefitRow[] = [
  {
    id: 'loyalty-balance',
    title: 'النقاط والمكافآت',
    subtitle: 'سيتم عرض رصيدك ومستواك بعد إطلاق برنامج الولاء.',
    badgeLabel: 'قريباً',
    badgeTone: 'info',
  },
];

export const FALLBACK_SUBSCRIPTION_ROWS: readonly BenefitRow[] = [
  {
    id: 'sub-placeholder',
    title: 'خطط الاشتراك',
    subtitle: 'ستظهر هنا خطط الاشتراك المتاحة بعد الإطلاق.',
    badgeLabel: 'قريباً',
    badgeTone: 'neutral',
  },
];

export const FALLBACK_OFFERS_ROWS: readonly BenefitRow[] = [
  {
    id: 'offers-placeholder',
    title: 'العروض والكوبونات',
    subtitle: 'ستظهر هنا عروضك وكوباناتك النشطة بعد الإطلاق.',
    badgeLabel: 'قريباً',
    badgeTone: 'neutral',
  },
];
