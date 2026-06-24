"use client";

import React from "react";
import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/app-shell";
import {
  Badge,
  Button,
  DataTable,
  Header,
  ScrollScreen,
  StateView,
  Text,
  spacing,
} from "@bthwani/ui-kit";
import { useCampaignsController, useBannersController, usePromosController } from "../../shared/marketing";

const STATUS_VARIANTS: Record<string, "success" | "warning" | "error" | "neutral"> = {
  active: "success",
  draft: "neutral",
  paused: "warning",
  completed: "neutral",
  cancelled: "error",
};

export function MarketingHubScreen() {
  const identity = useIdentitySession();
  const campaigns = useCampaignsController(identity.state.kind);
  const banners = useBannersController(identity.state.kind);
  const promos = usePromosController(identity.state.kind);

  if (identity.state.kind !== "authenticated") {
    return <StateView title="تسجيل الدخول مطلوب" description="هذه الشاشة للمشغّلين فقط." />;
  }

  return (
    <ScrollScreen>
      <Header title="مركز التسويق" subtitle="الحملات والبانرات والعروض الترويجية" />

      <View style={styles.section}>
        <Text variant="title">الحملات التسويقية</Text>
        {campaigns.state.kind === "loading" && <StateView title="جارٍ التحميل…" />}
        {campaigns.state.kind === "error" && (
          <StateView title="خطأ" description={campaigns.state.message} actionLabel="إعادة المحاولة" onAction={campaigns.reload} />
        )}
        {campaigns.state.kind === "success" && campaigns.state.items.length === 0 && (
          <StateView title="لا توجد حملات" description="أنشئ حملتك التسويقية الأولى." />
        )}
        {campaigns.state.kind === "success" && campaigns.state.items.length > 0 && (
          <DataTable
            columns={[
              { key: "title", label: "عنوان الحملة" },
              { key: "status", label: "الحالة", render: (v: string) => (
                <Badge label={v} variant={STATUS_VARIANTS[v] ?? "neutral"} />
              )},
              { key: "startDate", label: "تاريخ البداية" },
              { key: "endDate", label: "تاريخ النهاية" },
            ]}
            rows={campaigns.state.items}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text variant="title">البانرات</Text>
        {banners.state.kind === "loading" && <StateView title="جارٍ التحميل…" />}
        {banners.state.kind === "success" && banners.state.items.length === 0 && (
          <StateView title="لا توجد بانرات" />
        )}
        {banners.state.kind === "success" && banners.state.items.length > 0 && (
          <DataTable
            columns={[
              { key: "title", label: "العنوان" },
              { key: "position", label: "الموضع" },
              { key: "isActive", label: "الحالة", render: (v: boolean) => (
                <Badge label={v ? "نشط" : "مُعطَّل"} variant={v ? "success" : "neutral"} />
              )},
            ]}
            rows={banners.state.items}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text variant="title">الرموز الترويجية</Text>
        {promos.state.kind === "loading" && <StateView title="جارٍ التحميل…" />}
        {promos.state.kind === "success" && promos.state.items.length === 0 && (
          <StateView title="لا توجد رموز ترويجية" />
        )}
        {promos.state.kind === "success" && promos.state.items.length > 0 && (
          <DataTable
            columns={[
              { key: "code", label: "الرمز" },
              { key: "status", label: "الحالة", render: (v: string) => (
                <Badge label={v} variant={STATUS_VARIANTS[v] ?? "neutral"} />
              )},
              { key: "expiresAt", label: "ينتهي في" },
            ]}
            rows={promos.state.items}
          />
        )}
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  section: { margin: spacing.md, gap: spacing.sm },
});
