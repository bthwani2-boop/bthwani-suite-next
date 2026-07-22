import React from "react";
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { Header, ScrollScreen, StateView, Text, spacing, colorRoles } from "@bthwani/ui-kit";
import { useSubscriptionLifecycleController } from "../../shared/marketing/use-subscription-lifecycle-controller";
import type {
  ClientBenefitsPayload,
  SubscriptionPlanRecord,
} from "../../shared/marketing/loyalty-subscriptions.types";

export type BenefitsSection = "loyalty" | "subscription" | "offers";
export type BenefitsHubScreenProps = { readonly initialSection?: BenefitsSection };

type BenefitRow = {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly badge?: string;
  readonly helper?: string | undefined;
};

const LABELS: Record<BenefitsSection, string> = {
  loyalty: "النقاط والمكافآت",
  subscription: "الاشتراك",
  offers: "العروض والكوبونات",
};

function rowsFor(section: Exclude<BenefitsSection, "subscription">, benefits: ClientBenefitsPayload): readonly BenefitRow[] {
  if (section === "loyalty") {
    return [
      ...(benefits.loyaltyAccount
        ? [
            {
              id: "account",
              title: `${benefits.loyaltyAccount.pointsBalance.toLocaleString("ar")} نقطة`,
              subtitle: benefits.loyaltyAccount.tier
                ? `المستوى الحالي: ${benefits.loyaltyAccount.tier.nameAr}`
                : "لا يوجد مستوى حالي",
              badge: "رصيد WLT",
            },
          ]
        : []),
      ...benefits.availableTiers.map((tier) => ({
        id: tier.id,
        title: `${tier.badge || "⭐"} ${tier.nameAr}`,
        subtitle: `من ${tier.minPoints.toLocaleString("ar")} نقطة · خصم ${tier.discountPercent}%`,
        badge: "معتمد",
        helper:
          tier.freeDeliveryThreshold > 0
            ? `توصيل مجاني بعد ${tier.freeDeliveryThreshold.toLocaleString("ar")} ر.ي`
            : undefined,
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

function PlanCard({
  plan,
  disabled,
  onPurchase,
}: {
  readonly plan: SubscriptionPlanRecord;
  readonly disabled: boolean;
  readonly onPurchase: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{`${plan.badge || "🎟"} ${plan.nameAr}`}</Text>
        <Text style={styles.badge}>متاح</Text>
      </View>
      <Text style={styles.subtitle}>
        {plan.priceYer.toLocaleString("ar")} ر.ي · {plan.billingCycle}
      </Text>
      <Text style={styles.helper}>
        {plan.includeFreeDelivery ? "يتضمن التوصيل المجاني" : "المنافع تطبق وفق شروط الخطة"}
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`شراء اشتراك ${plan.nameAr}`}
        disabled={disabled}
        style={[styles.primaryAction, disabled && styles.disabled]}
        onPress={onPurchase}
      >
        <Text style={styles.primaryActionText}>{disabled ? "جارٍ التنفيذ…" : "شراء عبر المحفظة"}</Text>
      </TouchableOpacity>
    </View>
  );
}

export function BenefitsHubScreen({ initialSection = "loyalty" }: BenefitsHubScreenProps) {
  const [section, setSection] = React.useState<BenefitsSection>(initialSection);
  const [cancellationReason, setCancellationReason] = React.useState("");
  const controller = useSubscriptionLifecycleController();
  const benefits =
    controller.state.kind === "success" ||
    controller.state.kind === "empty" ||
    controller.state.kind === "partial"
      ? controller.state.benefits
      : null;
  const rows = benefits && section !== "subscription" ? rowsFor(section, benefits) : [];
  const busy = controller.busyAction !== null;

  const cancelActiveSubscription = () => {
    const subscription = benefits?.activeSubscription;
    if (!subscription) return;
    const reason = cancellationReason.trim();
    if (!reason) {
      Alert.alert("سبب الإلغاء مطلوب", "اكتب سببًا واضحًا قبل إرسال طلب الإلغاء.");
      return;
    }
    Alert.alert("تأكيد إلغاء الاشتراك", "ستتوقف المنافع المدفوعة، وقد ينشأ تعويض مالي قيد المراجعة في WLT.", [
      { text: "تراجع", style: "cancel" },
      {
        text: "تأكيد الإلغاء",
        style: "destructive",
        onPress: () => void controller.cancel(subscription.id, reason).then(() => setCancellationReason("")),
      },
    ]);
  };

  return (
    <ScrollScreen>
      <Header title={LABELS[section]} subtitle="بيانات معتمدة من DSH وWLT" />
      <View style={styles.tabs}>
        {(Object.keys(LABELS) as BenefitsSection[]).map((item) => (
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: item === section }}
            key={item}
            style={[styles.tab, item === section && styles.tabActive]}
            onPress={() => setSection(item)}
          >
            <Text style={[styles.tabText, item === section && styles.tabTextActive]}>{LABELS[item]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        {controller.state.kind === "loading" ? <StateView tone="neutral" title="جارٍ تحميل المزايا…" /> : null}
        {controller.state.kind === "offline" ? (
          <>
            <StateView tone="danger" title="الاتصال غير متاح" description={controller.state.message} />
            <TouchableOpacity style={styles.retry} onPress={() => void controller.reload()}>
              <Text style={styles.retryText}>إعادة المحاولة</Text>
            </TouchableOpacity>
          </>
        ) : null}
        {controller.state.kind === "forbidden" ? (
          <StateView tone="danger" title="لا يمكن عرض المنافع" description={controller.state.message} />
        ) : null}
        {controller.state.kind === "conflict" || controller.state.kind === "error" ? (
          <>
            <StateView tone="danger" title="تعذر تحميل المزايا" description={controller.state.message} />
            <TouchableOpacity style={styles.retry} onPress={() => void controller.reload()}>
              <Text style={styles.retryText}>إعادة المحاولة</Text>
            </TouchableOpacity>
          </>
        ) : null}
        {controller.state.kind === "partial" ? (
          <StateView tone="warning" title="بعض البيانات غير مكتملة" description={controller.state.message} />
        ) : null}
        {controller.actionError ? <StateView tone="danger" title="تعذر تنفيذ الإجراء" description={controller.actionError} /> : null}

        {benefits && section !== "subscription" && rows.length === 0 ? (
          <StateView tone="neutral" title="لا توجد مزايا معتمدة" />
        ) : null}
        {section !== "subscription"
          ? rows.map((row) => (
              <View key={row.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.title}>{row.title}</Text>
                  {row.badge ? <Text style={styles.badge}>{row.badge}</Text> : null}
                </View>
                <Text style={styles.subtitle}>{row.subtitle}</Text>
                {row.helper ? <Text style={styles.helper}>{row.helper}</Text> : null}
              </View>
            ))
          : null}

        {benefits && section === "subscription" ? (
          <>
            {benefits.compensation ? (
              <View style={styles.warningCard}>
                <Text style={styles.title}>تعويض الاشتراك: {benefits.compensation.status}</Text>
                <Text style={styles.subtitle}>{benefits.compensation.reason}</Text>
                <Text style={styles.helper}>
                  {benefits.compensation.amountMinorUnits.toLocaleString("ar")} {benefits.compensation.currency}
                  {benefits.compensation.refundReference
                    ? ` · المرجع ${benefits.compensation.refundReference}`
                    : " · بانتظار مرجع الإكمال من WLT"}
                </Text>
              </View>
            ) : null}

            {benefits.activeSubscription ? (
              <View style={styles.activeCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.title}>{benefits.activeSubscription.plan.nameAr}</Text>
                  <Text style={styles.activeBadge}>نشط</Text>
                </View>
                <Text style={styles.subtitle}>اشتراك مدفوع ومتحقق من WLT</Text>
                {benefits.activeSubscription.endsAt ? (
                  <Text style={styles.helper}>
                    ينتهي {new Date(benefits.activeSubscription.endsAt).toLocaleDateString("ar")}
                  </Text>
                ) : null}
                {(benefits.activeSubscription.allowedActions ?? []).includes("renew") ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="تجديد الاشتراك"
                    disabled={busy}
                    style={[styles.primaryAction, busy && styles.disabled]}
                    onPress={() => void controller.renew(benefits.activeSubscription!.id)}
                  >
                    <Text style={styles.primaryActionText}>بدء التجديد والدفع</Text>
                  </TouchableOpacity>
                ) : null}
                {(benefits.activeSubscription.allowedActions ?? []).includes("cancel") ? (
                  <>
                    <TextInput
                      accessibilityLabel="سبب إلغاء الاشتراك"
                      value={cancellationReason}
                      onChangeText={setCancellationReason}
                      editable={!busy}
                      placeholder="سبب الإلغاء"
                      placeholderTextColor={colorRoles.brandStructure}
                      style={styles.reasonInput}
                      textAlign="right"
                    />
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="إلغاء الاشتراك"
                      disabled={busy}
                      style={[styles.destructiveAction, busy && styles.disabled]}
                      onPress={cancelActiveSubscription}
                    >
                      <Text style={styles.destructiveActionText}>إلغاء الاشتراك</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            ) : null}

            {controller.pendingPurchase ? (
              <View style={styles.pendingCard}>
                <Text style={styles.title}>طلب الاشتراك: {controller.pendingPurchase.status}</Text>
                <Text style={styles.helper}>المرجع: {controller.pendingPurchase.id}</Text>
                {controller.paymentSession ? (
                  <Text style={styles.subtitle}>حالة الدفع في WLT: {controller.paymentSession.status}</Text>
                ) : null}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="تحديث حالة دفع الاشتراك"
                    disabled={busy}
                    style={[styles.secondaryAction, busy && styles.disabled]}
                    onPress={() => void controller.refreshPayment()}
                  >
                    <Text style={styles.secondaryActionText}>تحديث الدفع</Text>
                  </TouchableOpacity>
                  {controller.pendingPurchase.status === "payment_captured" ? (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="تفعيل الاشتراك بعد الدفع"
                      disabled={busy}
                      style={[styles.primaryAction, busy && styles.disabled]}
                      onPress={() => void controller.activate()}
                    >
                      <Text style={styles.primaryActionText}>تفعيل الآن</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ) : null}

            {!benefits.activeSubscription && !controller.pendingPurchase && benefits.availablePlans.length === 0 ? (
              <StateView tone="neutral" title="لا توجد خطط قابلة للشراء" />
            ) : null}
            {!benefits.activeSubscription
              ? benefits.availablePlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    disabled={busy}
                    onPurchase={() => void controller.purchase(plan.id)}
                  />
                ))
              : null}
          </>
        ) : null}
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row-reverse",
    borderBottomWidth: 1,
    borderBottomColor: colorRoles.borderSubtle,
    backgroundColor: colorRoles.surfaceBase,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing[3],
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: colorRoles.brandAction },
  tabText: { fontSize: 12, color: colorRoles.brandStructure, textAlign: "center" },
  tabTextActive: { color: colorRoles.brandAction, fontWeight: "700" },
  content: { padding: spacing[4], gap: spacing[3] },
  card: { padding: spacing[4], gap: spacing[2], borderRadius: 12, backgroundColor: colorRoles.surfaceBase },
  activeCard: {
    padding: spacing[4],
    gap: spacing[3],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colorRoles.brandAction,
    backgroundColor: colorRoles.surfaceBase,
  },
  pendingCard: {
    padding: spacing[4],
    gap: spacing[3],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    backgroundColor: colorRoles.surfaceBase,
  },
  warningCard: {
    padding: spacing[4],
    gap: spacing[2],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colorRoles.danger,
    backgroundColor: colorRoles.surfaceBase,
  },
  cardHeader: { flexDirection: "row-reverse", justifyContent: "space-between", gap: spacing[2] },
  title: { flex: 1, fontSize: 16, fontWeight: "700", textAlign: "right" },
  subtitle: { textAlign: "right", color: colorRoles.brandStructure },
  helper: { textAlign: "right", fontSize: 12, color: colorRoles.brandStructure },
  badge: { color: colorRoles.brandAction, fontWeight: "700", fontSize: 11 },
  activeBadge: { color: colorRoles.brandAction, fontWeight: "700", fontSize: 12 },
  retry: { alignItems: "center", padding: spacing[3], borderRadius: 10, backgroundColor: colorRoles.brandAction },
  retryText: { color: colorRoles.surfaceBase, fontWeight: "700" },
  reasonInput: {
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: 10,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    color: colorRoles.brandStructure,
    backgroundColor: colorRoles.surfaceBase,
  },
  actionRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing[2] },
  primaryAction: {
    alignItems: "center",
    padding: spacing[3],
    borderRadius: 10,
    backgroundColor: colorRoles.brandAction,
  },
  primaryActionText: { color: colorRoles.surfaceBase, fontWeight: "700" },
  secondaryAction: {
    alignItems: "center",
    padding: spacing[3],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    backgroundColor: colorRoles.surfaceBase,
  },
  secondaryActionText: { color: colorRoles.brandStructure, fontWeight: "700" },
  destructiveAction: {
    alignItems: "center",
    padding: spacing[3],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colorRoles.danger,
    backgroundColor: colorRoles.surfaceBase,
  },
  destructiveActionText: { color: colorRoles.danger, fontWeight: "700" },
  disabled: { opacity: 0.5 },
});
