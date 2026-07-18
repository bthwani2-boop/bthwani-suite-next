import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Header, ScrollScreen, StateView, Text, spacing, colorRoles } from "@bthwani/ui-kit";
import { useClientBenefitsController, type ClientBenefitsPayload } from "../../shared/marketing";

export type BenefitsSection = "loyalty" | "subscription" | "offers";
export type BenefitsHubScreenProps = { readonly initialSection?: BenefitsSection };

type BenefitRow = {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly badge?: string;
  readonly helper?: string;
};

const LABELS: Record<BenefitsSection, string> = {
  loyalty: "النقاط والمكافآت",
  subscription: "الاشتراك",
  offers: "العروض والكوبونات",
};

function rowsFor(section: BenefitsSection, benefits: ClientBenefitsPayload): readonly BenefitRow[] {
  if (section === "loyalty") {
    return [
      ...(benefits.loyaltyAccount ? [{
        id: "account",
        title: `${benefits.loyaltyAccount.pointsBalance.toLocaleString("ar")} نقطة`,
        subtitle: benefits.loyaltyAccount.tier ? `المستوى الحالي: ${benefits.loyaltyAccount.tier.nameAr}` : "لا يوجد مستوى حالي",
        badge: "رصيد WLT",
      }] : []),
      ...benefits.availableTiers.map((tier) => ({
        id: tier.id,
        title: `${tier.badge || "⭐"} ${tier.nameAr}`,
        subtitle: `من ${tier.minPoints.toLocaleString("ar")} نقطة · خصم ${tier.discountPercent}%`,
        badge: "معتمد",
        helper: tier.freeDeliveryThreshold > 0 ? `توصيل مجاني بعد ${tier.freeDeliveryThreshold.toLocaleString("ar")} ر.ي` : undefined,
      })),
    ];
  }
  if (section === "subscription") {
    return [
      ...(benefits.activeSubscription ? [{
        id: benefits.activeSubscription.id,
        title: benefits.activeSubscription.plan.nameAr,
        subtitle: "اشتراك نشط ومتحقق من WLT",
        badge: "نشط",
        helper: benefits.activeSubscription.endsAt ? `ينتهي ${new Date(benefits.activeSubscription.endsAt).toLocaleDateString("ar")}` : undefined,
      }] : []),
      ...benefits.availablePlans.map((plan) => ({
        id: plan.id,
        title: `${plan.badge || "🎟"} ${plan.nameAr}`,
        subtitle: `${plan.priceYer.toLocaleString("ar")} ر.ي · ${plan.billingCycle}`,
        badge: "متاح",
        helper: plan.wltProductReference ? `مرجع WLT: ${plan.wltProductReference}` : undefined,
      })),
    ];
  }
  return benefits.offers.map((offer) => ({
    id: offer.id,
    title: offer.title,
    subtitle: `${offer.storeLabel || offer.partnerName} · ${offer.valueLabel}`,
    badge: offer.offerType === "coupon" ? "كوبون" : "عرض",
    helper: offer.eligibility,
  }));
}

export function BenefitsHubScreen({ initialSection = "loyalty" }: BenefitsHubScreenProps) {
  const [section, setSection] = React.useState<BenefitsSection>(initialSection);
  const controller = useClientBenefitsController();
  const benefits = controller.state.kind === "success" ? controller.state.benefits : null;
  const rows = benefits ? rowsFor(section, benefits) : [];

  return (
    <ScrollScreen>
      <Header title={LABELS[section]} subtitle="بيانات معتمدة من DSH وWLT" />
      <View style={styles.tabs}>
        {(Object.keys(LABELS) as BenefitsSection[]).map((item) => (
          <TouchableOpacity key={item} style={[styles.tab, item === section && styles.tabActive]} onPress={() => setSection(item)}>
            <Text style={[styles.tabText, item === section && styles.tabTextActive]}>{LABELS[item]}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.content}>
        {controller.state.kind === "loading" ? <StateView tone="neutral" title="جارٍ تحميل المزايا…" /> : null}
        {controller.state.kind === "error" ? (
          <>
            <StateView tone="danger" title="تعذر تحميل المزايا" description={controller.state.message} />
            <TouchableOpacity style={styles.retry} onPress={() => void controller.reload()}><Text style={styles.retryText}>إعادة المحاولة</Text></TouchableOpacity>
          </>
        ) : null}
        {controller.state.kind === "success" && rows.length === 0 ? <StateView tone="neutral" title="لا توجد مزايا معتمدة" /> : null}
        {rows.map((row) => (
          <View key={row.id} style={styles.card}>
            <View style={styles.cardHeader}><Text style={styles.title}>{row.title}</Text>{row.badge ? <Text style={styles.badge}>{row.badge}</Text> : null}</View>
            <Text style={styles.subtitle}>{row.subtitle}</Text>
            {row.helper ? <Text style={styles.helper}>{row.helper}</Text> : null}
          </View>
        ))}
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row-reverse", borderBottomWidth: 1, borderBottomColor: colorRoles.borderSubtle, backgroundColor: colorRoles.surfaceBase },
  tab: { flex: 1, alignItems: "center", paddingVertical: spacing[3], borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: colorRoles.brandAction },
  tabText: { fontSize: 12, color: colorRoles.brandStructure, textAlign: "center" },
  tabTextActive: { color: colorRoles.brandAction, fontWeight: "700" },
  content: { padding: spacing[4], gap: spacing[3] },
  card: { padding: spacing[4], gap: spacing[2], borderRadius: 12, backgroundColor: colorRoles.surfaceBase },
  cardHeader: { flexDirection: "row-reverse", justifyContent: "space-between", gap: spacing[2] },
  title: { flex: 1, fontSize: 16, fontWeight: "700", textAlign: "right" },
  subtitle: { textAlign: "right", color: colorRoles.brandStructure },
  helper: { textAlign: "right", fontSize: 12, color: colorRoles.brandStructure },
  badge: { color: colorRoles.brandAction, fontWeight: "700", fontSize: 11 },
  retry: { alignItems: "center", padding: spacing[3], borderRadius: 10, backgroundColor: colorRoles.brandAction },
  retryText: { color: colorRoles.surfaceBase, fontWeight: "700" },
});
