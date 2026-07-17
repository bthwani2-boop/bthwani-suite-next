import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  MobileScrollView,
  StateView,
  Text,
  TopBar,
  colorRoles,
  spacing,
} from "@bthwani/ui-kit";
import { useClientBenefitsController } from "../../shared/marketing";
import type {
  ClientBenefitsPayload,
  LoyaltyTierRecord,
  PublishedPartnerOffer,
  SubscriptionPlanRecord,
} from "../../shared/marketing";

export type BenefitsSection = "loyalty" | "subscriptions" | "offers";

const SECTION_LABEL: Record<BenefitsSection, string> = {
  loyalty: "الولاء والنقاط",
  subscriptions: "الاشتراكات",
  offers: "العروض",
};

function SectionTabs({
  value,
  onChange,
}: {
  readonly value: BenefitsSection;
  readonly onChange: (section: BenefitsSection) => void;
}) {
  return (
    <View style={styles.tabs}>
      {(Object.keys(SECTION_LABEL) as BenefitsSection[]).map((section) => (
        <Pressable
          key={section}
          onPress={() => onChange(section)}
          style={[styles.tab, value === section && styles.activeTab]}
        >
          <Text
            role="bodySm"
            style={[styles.tabLabel, value === section && styles.activeTabLabel]}
          >
            {SECTION_LABEL[section]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function InfoCard({
  title,
  subtitle,
  meta,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly meta?: string;
}) {
  return (
    <View style={styles.card}>
      <Text role="bodyStrong" style={styles.cardTitle}>{title}</Text>
      <Text role="bodySm" tone="muted" style={styles.cardSubtitle}>{subtitle}</Text>
      {meta ? <Text role="caption" tone="muted" style={styles.cardMeta}>{meta}</Text> : null}
    </View>
  );
}

function LoyaltyContent({ benefits }: { readonly benefits: ClientBenefitsPayload }) {
  const account = benefits.loyaltyAccount;
  return (
    <View style={styles.sectionContent}>
      {account ? (
        <View style={styles.summaryCard}>
          <Text role="caption" tone="muted">رصيد النقاط المعتمد</Text>
          <Text role="titleLg" style={styles.summaryValue}>{account.pointsBalance.toLocaleString("ar")}</Text>
          <Text role="bodySm" tone="muted">
            نقاط مدى الحياة: {account.lifetimePoints.toLocaleString("ar")}
          </Text>
          {account.tier ? (
            <Text role="bodyStrong" style={styles.summaryTier}>
              المستوى الحالي: {account.tier.badge} {account.tier.nameAr}
            </Text>
          ) : null}
        </View>
      ) : (
        <StateView
          title="لا يوجد حساب ولاء بعد"
          description="سيظهر رصيد النقاط هنا بعد أول حركة ولاء موثقة لهذا الحساب."
        />
      )}

      {benefits.availableTiers.length > 0 ? (
        <>
          <Text role="titleSm" style={styles.sectionTitle}>المستويات المعتمدة</Text>
          {benefits.availableTiers.map((tier: LoyaltyTierRecord) => (
            <InfoCard
              key={tier.id}
              title={`${tier.badge} ${tier.nameAr}`}
              subtitle={`خصم ${tier.discountPercent}% ابتداءً من ${tier.minPoints.toLocaleString("ar")} نقطة`}
              meta={tier.freeDeliveryThreshold > 0
                ? `توصيل مجاني للطلبات فوق ${tier.freeDeliveryThreshold.toLocaleString("ar")} ر.ي`
                : undefined}
            />
          ))}
        </>
      ) : null}
    </View>
  );
}

function SubscriptionContent({ benefits }: { readonly benefits: ClientBenefitsPayload }) {
  const active = benefits.activeSubscription;
  return (
    <View style={styles.sectionContent}>
      {active ? (
        <View style={styles.summaryCard}>
          <Text role="caption" tone="muted">اشتراكك النشط</Text>
          <Text role="titleMd" style={styles.summaryValue}>{active.plan.badge} {active.plan.nameAr}</Text>
          <Text role="bodySm" tone="muted">
            {active.plan.priceYer.toLocaleString("ar")} ر.ي · {active.plan.billingCycle}
          </Text>
          {active.endsAt ? <Text role="caption" tone="muted">ينتهي: {active.endsAt}</Text> : null}
        </View>
      ) : (
        <StateView
          title="لا يوجد اشتراك نشط"
          description="تعرض هذه الصفحة الاشتراكات المؤكدة فقط بعد اكتمال مرجع الدفع في WLT."
        />
      )}

      {benefits.availablePlans.length > 0 ? (
        <>
          <Text role="titleSm" style={styles.sectionTitle}>الخطط المتاحة والمعتمدة</Text>
          {benefits.availablePlans.map((plan: SubscriptionPlanRecord) => (
            <InfoCard
              key={plan.id}
              title={`${plan.badge} ${plan.nameAr}`}
              subtitle={`${plan.priceYer.toLocaleString("ar")} ر.ي · ${plan.billingCycle}`}
              meta={`${plan.includeFreeDelivery ? "يشمل التوصيل المجاني" : "لا يشمل التوصيل المجاني"} · مضاعف نقاط ×${plan.pointsMultiplier}`}
            />
          ))}
        </>
      ) : null}
    </View>
  );
}

function OffersContent({ benefits }: { readonly benefits: ClientBenefitsPayload }) {
  if (benefits.offers.length === 0) {
    return (
      <StateView
        title="لا توجد عروض منشورة"
        description="لا تظهر هنا إلا العروض التي اعتمدها التسويق وما تزال ضمن فترة صلاحيتها."
      />
    );
  }

  return (
    <View style={styles.sectionContent}>
      {benefits.offers.map((offer: PublishedPartnerOffer) => (
        <InfoCard
          key={offer.id}
          title={offer.title}
          subtitle={`${offer.partnerName} · ${offer.valueLabel}`}
          meta={`${offer.eligibility}${offer.activeToDate ? ` · حتى ${offer.activeToDate}` : ""}`}
        />
      ))}
    </View>
  );
}

export function BenefitsHubScreen() {
  const controller = useClientBenefitsController();
  const [section, setSection] = useState<BenefitsSection>("loyalty");

  const content = useMemo(() => {
    if (controller.state.kind !== "success") {
      return null;
    }
    if (section === "loyalty") {
      return <LoyaltyContent benefits={controller.state.benefits} />;
    }
    if (section === "subscriptions") {
      return <SubscriptionContent benefits={controller.state.benefits} />;
    }
    return <OffersContent benefits={controller.state.benefits} />;
  }, [controller.state, section]);

  return (
    <View style={styles.container}>
      <TopBar title="المزايا والولاء" />
      <SectionTabs value={section} onChange={setSection} />
      {controller.state.kind === "loading" ? (
        <StateView title="جارٍ تحميل المزايا" description="يتم التحقق من البيانات المعتمدة لهذا الحساب." />
      ) : controller.state.kind === "error" ? (
        <StateView
          title="تعذر تحميل المزايا"
          description={controller.state.message}
          actionLabel="إعادة المحاولة"
          onActionPress={() => void controller.reload()}
        />
      ) : (
        <MobileScrollView fill padding={4} gap={3} contentContainerStyle={styles.scrollContent}>
          {content}
        </MobileScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorRoles.surfaceWarm,
  },
  tabs: {
    flexDirection: "row-reverse",
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colorRoles.borderSubtle,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing[3],
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: colorRoles.brandAction,
  },
  tabLabel: {
    textAlign: "center",
    color: colorRoles.textSecondary,
  },
  activeTabLabel: {
    color: colorRoles.brandAction,
    fontWeight: "700",
  },
  scrollContent: {
    paddingBottom: spacing[12],
  },
  sectionContent: {
    gap: spacing[3],
  },
  sectionTitle: {
    textAlign: "right",
    color: colorRoles.textPrimary,
    marginTop: spacing[2],
  },
  summaryCard: {
    padding: spacing[4],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    backgroundColor: colorRoles.surfaceBase,
    alignItems: "flex-end",
    gap: spacing[1],
  },
  summaryValue: {
    color: colorRoles.brandAction,
    textAlign: "right",
  },
  summaryTier: {
    color: colorRoles.textPrimary,
    textAlign: "right",
    marginTop: spacing[1],
  },
  card: {
    padding: spacing[4],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    backgroundColor: colorRoles.surfaceBase,
    alignItems: "flex-end",
    gap: spacing[1],
  },
  cardTitle: {
    color: colorRoles.textPrimary,
    textAlign: "right",
  },
  cardSubtitle: {
    textAlign: "right",
  },
  cardMeta: {
    textAlign: "right",
  },
});
