import React from "react";
import { Badge, Card, Header, ListItem, LoadingState, ScrollScreen, StateView, Text } from "@bthwani/ui-kit";
import { usePublishedCatalogController } from "../../shared/catalog";

export function PublishedCatalogScreen({ storeId }: { readonly storeId: string }) {
  const controller = usePublishedCatalogController(storeId);

  if (controller.state.kind === "loading") {
    return <LoadingState title="جاري تحميل الكتالوج…" />;
  }

  if (controller.state.kind === "empty") {
    return (
      <StateView
        title="لا توجد منتجات منشورة"
        description="لم يُعتمد أي منتج لهذا المتجر حتى الآن."
      />
    );
  }

  if (controller.state.kind === "error") {
    return (
      <StateView
        title="تعذر تحميل الكتالوج"
        description={controller.state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={controller.retry}
      />
    );
  }

  if (controller.state.kind === "permission_denied") {
    return (
      <StateView
        title="الكتالوج غير متاح"
        description="لا يمكن تحميل هذا الكتالوج حاليًا."
      />
    );
  }

  const { categories, products } = controller.state.catalog;
  const activeCategoryIds = new Set(categories.filter((c) => c.isActive).map((c) => c.id));

  return (
    <ScrollScreen>
      <Header title="كتالوج المتجر" subtitle="منتجات وتصنيفات معتمدة ومنشورة فقط" />
      {categories.filter((c) => c.isActive).map((category) => {
        const categoryProducts = products.filter(
          (p) => p.categoryId === category.id && p.isActive,
        );
        if (categoryProducts.length === 0) return null;
        return (
          <React.Fragment key={category.id}>
            <Text role="titleMd">{category.name}</Text>
            <Card>
              {categoryProducts.map((product) => (
                <ListItem
                  key={product.id}
                  title={product.name}
                  subtitle={product.description || product.sku}
                  trailing={<Badge label="معتمد" tone="success" />}
                />
              ))}
            </Card>
          </React.Fragment>
        );
      })}
      {products.filter((p) => p.isActive && (p.categoryId === null || !activeCategoryIds.has(p.categoryId))).length > 0 && (
        <Card>
          {products
            .filter((p) => p.isActive && (p.categoryId === null || !activeCategoryIds.has(p.categoryId)))
            .map((product) => (
              <ListItem
                key={product.id}
                title={product.name}
                subtitle={product.description || product.sku}
                trailing={<Badge label="معتمد" tone="success" />}
              />
            ))}
        </Card>
      )}
    </ScrollScreen>
  );
}
