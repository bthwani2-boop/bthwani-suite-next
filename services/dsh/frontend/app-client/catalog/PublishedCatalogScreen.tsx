import React from "react";
import { Card, Header, ListItem, ScrollScreen, StateView, Badge } from "@bthwani/ui-kit";
import { usePublishedCatalogController } from "../../shared/catalog";

export function PublishedCatalogScreen({ storeId }: { readonly storeId: string }) {
  const controller = usePublishedCatalogController(storeId);
  if (controller.state.kind !== "success") {
    return (
      <StateView
        title={controller.state.kind === "empty" ? "لا توجد منتجات منشورة" : "تعذر تحميل الكتالوج"}
        description={controller.state.kind === "error" ? controller.state.message : "يظهر هنا الكتالوج المعتمد فقط."}
        {...(controller.state.kind === "error" ? { actionLabel: "إعادة المحاولة", onActionPress: controller.retry } : {})}
      />
    );
  }
  return (
    <ScrollScreen>
      <Header title="كتالوج المتجر" subtitle="منتجات وتصنيفات معتمدة ومنشورة فقط" />
      <Card>
        {controller.state.catalog.products.map((product) => (
          <ListItem
            key={product.id}
            title={product.name}
            subtitle={product.description || product.sku}
            trailing={<Badge label="معتمد" tone="success" />}
          />
        ))}
      </Card>
    </ScrollScreen>
  );
}
