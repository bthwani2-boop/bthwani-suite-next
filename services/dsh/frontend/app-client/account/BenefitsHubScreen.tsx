// Authority: services/dsh/frontend/app-client — benefits sub-screen.
// Sovereign owners: DSH marketing approval and WLT commercial/financial truth.

import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import {
  Header,
  ScrollScreen,
  StateView,
  Text,
  spacing,
  colorRoles,
} from "@bthwani/ui-kit";
import { useClientBenefitsController } from "../../shared/marketing";
import type { BenefitRow, ClientBenefitsPayload } from "../../shared/marketing";

export type BenefitsSection = "loyalty" | "subscription" | "offers";

export type BenefitsHubScreenProps = {
  initialSection?: BenefitsSection;
  onBack?: () => void;
  onAction?: (rowId: string, section: BenefitsSection) => void;
};

type BenefitsSectionConfig = {
  readonly label: string;
  readonly subtitle: string;
  readonly emptyDescription: string;
};

const SECTION_CONFIG: Record<BenefitsSection, BenefitsSectionConfig> = {
  loyalty: {
    label: "النقاط والمكافآت",
    subtitle: "رصيد الولاء والمكافآت المعتمدة",
    emptyDescription: "لا توجد مكافآت ولاء معتمدة ومتاحة لهذا الحساب حالياً.",
  },
  subscription: {
    label: "الاشتراك",
    subtitle: "خطط الاشتراك المعتمدة والمتاحة",
    emptyDescription: "لا توجد خطط اشتراك معتمدة ومتاحة حالياً.",
  },
  offers: {
    label: "العروض والكوبونات",
    subtitle: "العروض والكوبونات المعتمدة والمتاحة",
    emptyDescription: "لا توجد عروض أو كوبونات معتمدة ومتاحة لهذا الحساب حالياً.",
  },
};

function buildRows(section: BenefitsSection, benefits: ClientBenefitsPayload): readonly BenefitRow[] {
  if (section === "loyalty") {
    const accountRows: BenefitRow[] = benefits.loyaltyAccount ? [{
      id: "loyalty-account",
      title: `${benefits.loyaltyAccount.pointsBalance.toLocaleString("ar")} نقطة`,
      subtitle: benefits.loyaltyAccount.tier
        ? `مستواك الحالي: ${benefits.loyaltyAccount.tier.nameAr}`
        : "لم تصل إلى مستوى ولاء معتمد بعد.",
      badgeLabel: "رصيدك",
      badgeTone: "success",
    }] : [];
    const tierRows: BenefitRow[] = benefits.availableTiers.map((tier) => ({
      id: `tier-${tier.id}`,
      title: `${tier.badge || "⭐"} ${tier.nameAr}`,
      subtitle: `يبدأ من ${tier.minPoints.toLocaleString("ar")} نقطة — خصم ${tier.discountPercent}%`,
      badgeLabel: "معتمد",
      badgeTone: "info",
      helperText: tier.freeDeliveryThreshold > 0
        ? `توصيل مجاني عند تجاوز ${tier.freeDeliveryThreshold.toLocaleString("ar")} ر.ي`
        : undefined,
    }));
    return [...accountRows, ...tierRows];
  }

  if (section === "subscription") {
    const activeRows: BenefitRow[] = benefits.activeSubscription ? [{
      id: `active-subscription-${benefits.activeSubscription.id}`,
      title: benefits.activeSubscription.plan.nameAr,
      subtitle: "اشتراكك النشط والمتحقق من مرجع WLT",
      badgeLabel: "نشط",
      badgeTone: "success",
      helperText: benefits.activeSubscription.endsAt
        ? `ينتهي: ${new Date(benefits.activeSubscription.endsAt).toLocaleDateString("ar")}`
        : undefined,
    }] : [];
    const planRows: BenefitRow[] = benefits.availablePlans.map((plan) => ({
      id: `plan-${plan.id}`,
      title: `${plan.badge || "🎟"} ${plan.nameAr}`,
      subtitle: `${plan.priceYer.toLocaleString("ar")} ر.ي / ${
        plan.billingCycle === "monthly" ? "شهر" : plan.billingCycle === "quarterly" ? "ربع سنة" : "سنة"
      }`,
      badgeLabel: "متاح",
      badgeTone: "action",
      actionLabel: "عرض الخطة",
      helperText: plan.includeFreeDelivery
        ? `يشمل التوصيل المجاني ومضاعف نقاط ×${plan.pointsMultiplier}`
        : `مضاعف نقاط ×${plan.pointsMultiplier}`,
    }));
    return [...activeRows, ...planRows];
  }

  return benefits.offers.map((offer) => ({
    id: `offer-${offer.id}`,
    title: offer.title,
    subtitle: `${offer.storeLabel || offer.partnerName} — ${offer.valueLabel}`,
    badgeLabel: offer.offerType === "coupon" ? "كوبون" : "عرض معتمد",
    badgeTone: "success",
    actionLabel: "عرض المتجر",
    helperText: offer.eligibility,
  }));
}

export function BenefitsHubScreen({
  initialSection = "loyalty",
  onAction,
}: BenefitsHubScreenProps) {
  const [section, setSection] = React.useState<BenefitsSection>(initialSection);
  const controller = useClientBenefitsController("authenticated");
  const config = SECTION_CONFIG[section];
  const rows = controller.benefits ? buildRows(section, controller.benefits) : [];

  return (
    <ScrollScreen>
      <Header title={config.label} subtitle={config.subtitle} />

      <View style={styles.tabBar}>
        {(Object.keys(SECTION_CONFIG) as BenefitsSection[]).map((candidate) => (
          <TouchableOpacity
            key={candidate}
            style={[styles.tab, section === candidate && styles.tabActive]}
            onPress={() => setSection(candidate)}
          >
            <Text style={[styles.tabText, section === candidate && styles.tabTextActive]}>
              {SECTION_CONFIG[candidate].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        {controller.state.kind === "loading" ? (
          <StateView tone="neutral" title="جاري تحميل المزايا المعتمدة…" />
        ) : controller.state.kind === "error" ? (
          <>
            <StateView tone="danger" title="تعذر تحميل المزايا" description={controller.state.message} />
            <TouchableOpacity style={styles.retryButton} onPress={() => void controller.reload()}>
              <Text style={styles.retryText}>إعادة المحاولة</Text>
            </TouchableOpacity>
          </>
        ) : controller.state.kind === "empty" || rows.length === 0 ? (
          <StateView tone="neutral" title="لا توجد بيانات معتمدة" description={config.emptyDescription} />
        ) : (
          rows.map((row) => (
            <View key={row.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{row.title}</Text>
                {row.badgeLabel ? <Text style={styles.badge}>{row.badgeLabel}</Text> : null}
              </View>
              <Text style={styles.cardSubtitle}>{row.subtitle}</Text>
              {row.helperText ? <Text style={styles.helperText}>{row.helperText}</Text> : null}
              {row.actionLabel && onAction ? (
                <TouchableOpacity style={styles.actionButton} onPress={() => onAction(row.id, section)}>
                  <Text style={styles.actionText}>{row.actionLabel}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))
        )}
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row-reverse",
    backgroundColor: colorRoles.surfaceBase,
    borderBottomWidth: 1,
    borderBottomColor: colorRoles.surfaceBase,
    paddingHorizontal: spacing[4],
  },
  tab: {
    flex: 1,
    paddingVertical: spacing[3],
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: colorRoles.brandAction },
  tabText: {
    fontSize: 13,
    color: colorRoles.brandStructure,
    fontWeight: "600",
    textAlign: "center",
  },
  tabTextActive: { color: colorRoles.brandAction, fontWeight: "700" },
  content: { padding: spacing[4], gap: spacing[3] },
  card: {
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: 12,
    padding: spacing[4],
    gap: spacing[2],
  },
  cardHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[2],
  },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "700", textAlign: "right" },
  cardSubtitle: { fontSize: 14, textAlign: "right", color: colorRoles.brandStructure },
  helperText: { fontSize: 12, textAlign: "right", color: colorRoles.brandStructure },
  badge: { fontSize: 11, fontWeight: "700", color: colorRoles.brandAction },
  retryButton: {
    alignSelf: "stretch",
    alignItems: "center",
    borderRadius: 10,
    paddingVertical: spacing[3],
    backgroundColor: colorRoles.brandAction,
  },
  retryText: { fontWeight: "700", color: colorRoles.surfaceBase },
  actionButton: { alignSelf: "flex-start", paddingVertical: spacing[2], paddingHorizontal: spacing[3] },
  actionText: { color: colorRoles.brandAction, fontWeight: "700" },
});
