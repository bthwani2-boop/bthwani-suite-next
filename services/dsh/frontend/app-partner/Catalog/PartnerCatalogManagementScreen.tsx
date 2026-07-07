import React from "react";
import { StyleSheet, View } from "react-native";
import { devBypassLogin, useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  Button,
  Card,
  ListItem,
  ScrollScreen,
  StateView,
  Text,
  spacing,
} from "@bthwani/ui-kit";
import { AuthLoginCard } from "../../shared/auth/AuthLoginCard";
import { usePartnerCatalogController } from "../../shared/catalog";

export function PartnerCatalogManagementScreen() {
  const identity = useIdentitySession();
  const controller = usePartnerCatalogController(identity.state.kind);
  const { state, action } = controller;

  if (identity.state.kind !== "authenticated") {
    return (
      <ScrollScreen>
        <AuthLoginCard
          title="تسجيل دخول الشريك"
          subtitle="إدارة الكتالوج مرتبطة بهوية الشريك والمتجر."
          loading={identity.state.kind === "authenticating"}
          {...(identity.state.kind === "error" ? { error: identity.state.message } : {})}
          onSubmit={(username, password) => void identity.login(username, password)}
          onDevBypass={() => devBypassLogin("partner")}
        />
      </ScrollScreen>
    );
  }

  if (state.kind === "loading") {
    return <StateView title="جاري تحميل الكتالوج" loading />;
  }

  if (state.kind === "permission_denied") {
    return <StateView title="غير مصرح" description="لا تملك صلاحية إدارة كتالوج هذا المتجر." tone="warning" />;
  }

  if (state.kind === "error") {
    return (
      <StateView
        title="تعذر تحميل الكتالوج"
        description={state.message}
        tone="danger"
        actionLabel="إعادة المحاولة"
        onActionPress={controller.retry}
      />
    );
  }

  if (state.kind === "empty") {
    return (
      <StateView
        title="لا يوجد كتالوج"
        description="لم يتم ربط كتالوج بهذا المتجر بعد."
        actionLabel="إعادة التحميل"
        onActionPress={controller.retry}
      />
    );
  }

  const { catalog } = state;
  const activeProducts = catalog.products.filter((product) => product.isActive).length;
  const activeCategories = catalog.categories.filter((category) => category.isActive).length;

  return (
    <ScrollScreen>
      <Card>
        <View style={styles.hero}>
          <View style={styles.headerRow}>
            <Text role="titleLg" align="start">إدارة الكتالوج</Text>
            <Badge label={action === "submitting" ? "جاري الحفظ" : "متصل"} tone={action === "error" ? "danger" : "info"} />
          </View>
          <Text tone="secondary" align="start">المتجر: {catalog.storeId}</Text>
          <View style={styles.metrics}>
            <Badge label={`${activeCategories}/${catalog.categories.length} فئات نشطة`} tone="neutral" />
            <Badge label={`${activeProducts}/${catalog.products.length} منتجات نشطة`} tone="neutral" />
          </View>
        </View>
      </Card>

      {action === "success" && (
        <StateView title="تم تحديث الكتالوج" tone="success" />
      )}
      {action === "error" && (
        <StateView title="تعذر حفظ الإجراء" tone="danger" />
      )}
      {action === "conflict" && (
        <StateView title="تعارض في نسخة الكتالوج" description="أعد التحميل ثم حاول مجددًا." tone="warning" />
      )}

      <Text role="titleMd" align="start">الفئات</Text>
      <Card>
        {catalog.categories.length === 0 ? (
          <View style={styles.section}>
            <Text tone="secondary" align="center">لا توجد فئات معرفة.</Text>
          </View>
        ) : (
          catalog.categories.map((category) => (
            <ListItem
              key={category.id}
              title={category.name}
              subtitle={category.description || `ترتيب العرض ${category.sortOrder}`}
              trailing={<Badge label={category.isActive ? "نشطة" : "متوقفة"} tone={category.isActive ? "success" : "neutral"} />}
            />
          ))
        )}
      </Card>

      <Text role="titleMd" align="start">المنتجات</Text>
      <Card>
        {catalog.products.length === 0 ? (
          <View style={styles.section}>
            <Text tone="secondary" align="center">لا توجد منتجات في الكتالوج.</Text>
          </View>
        ) : (
          catalog.products.map((product) => (
            <ListItem
              key={product.id}
              title={product.name}
              subtitle={`${product.sku} - ${product.priceReference}`}
              trailing={<Badge label={product.isActive ? "متاح" : "موقوف"} tone={product.isActive ? "success" : "warning"} />}
            />
          ))
        )}
      </Card>

      <Button
        label={action === "submitting" ? "جاري الإرسال" : "إرسال الكتالوج للمراجعة"}
        tone="primary"
        disabled={action === "submitting"}
        onPress={() => void controller.submit()}
      />
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: spacing[4],
    gap: spacing[2],
  },
  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[2],
  },
  metrics: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  section: {
    padding: spacing[4],
    gap: spacing[2],
  },
});

// export default PartnerCatalogManagementScreen; // Unused default export