import React, { useCallback } from "react";
import { LoadingState, StateView } from "@bthwani/ui-kit";
import { useStoreDetailController } from "../../shared/store";
import { usePublishedCatalogController } from "../../shared/catalog";
import type {
  CatalogCategory,
  CatalogProduct,
} from "../../shared/catalog/client-catalog.types";
import type { DshFulfillmentDeliveryMode } from "../../shared/delivery/delivery.contract";
import { StoreDetailShell } from "./StoreDetailShell";
import { useIdentitySession } from "@bthwani/core-identity";
import { useCartController } from "../../shared/cart";

type Props = Readonly<{
  storeId: string;
  onBack?: (() => void) | undefined;
  onGoToCart?: (() => void) | undefined;
}>;

export function StoreDetailScreen({ storeId, onBack, onGoToCart }: Props) {
  const identity = useIdentitySession();
  const authKind =
    identity.state.kind === "authenticated" ? "authenticated" : "unauthenticated";
  const storeCtrl = useStoreDetailController(storeId);
  const catalogCtrl = usePublishedCatalogController(storeId);
  const cartCtrl = useCartController(storeId, authKind);

  const handleRetry = useCallback(() => {
    storeCtrl.retry();
    catalogCtrl.retry();
    cartCtrl.retry();
  }, [storeCtrl, catalogCtrl, cartCtrl]);

  const handleAddToCart = useCallback(
    (
      product: CatalogProduct,
      quantity: number,
      mode: DshFulfillmentDeliveryMode,
    ) => {
      void cartCtrl.addItem({
        masterProductId: product.id,
        productName: product.name,
        priceReference: product.priceReference,
        quantity,
        fulfillmentMode: mode,
      });
    },
    [cartCtrl],
  );

  if (storeCtrl.state.kind === "loading" || catalogCtrl.state.kind === "loading") {
    return <LoadingState title="جاري تحميل واجهة المتجر…" />;
  }

  if (storeCtrl.state.kind === "service_unavailable") {
    return (
      <StateView
        title="الخدمة غير متاحة"
        description="تعذر الوصول إلى الخادم، يرجى المحاولة لاحقاً."
        actionLabel="إعادة المحاولة"
        onActionPress={handleRetry}
      />
    );
  }

  if (storeCtrl.state.kind === "error") {
    return (
      <StateView
        title="تعذر تحميل المتجر"
        description={storeCtrl.state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={handleRetry}
      />
    );
  }

  if (
    catalogCtrl.state.kind === "error" ||
    catalogCtrl.state.kind === "permission_denied"
  ) {
    const message =
      catalogCtrl.state.kind === "error"
        ? catalogCtrl.state.message
        : "لا توجد صلاحيات لعرض كتالوج هذا المتجر.";
    return (
      <StateView
        title="تعذر تحميل المنتجات"
        description={message}
        actionLabel="إعادة المحاولة"
        onActionPress={handleRetry}
      />
    );
  }

  if (
    storeCtrl.state.kind !== "success" ||
    catalogCtrl.state.kind !== "success"
  ) {
    return (
      <StateView
        title="تعذر عرض المتجر"
        description="لم تعد بيانات المتجر أو الكتالوج في حالة قابلة للعرض."
        actionLabel="إعادة المحاولة"
        onActionPress={handleRetry}
      />
    );
  }

  const store = storeCtrl.state.store;
  if (!store.isClientEligible) {
    return (
      <StateView
        title="المتجر غير منشور"
        description="لم يجتز المتجر بوابة النشر للعميل."
        {...(onBack ? { actionLabel: "العودة", onActionPress: onBack } : {})}
      />
    );
  }
  if (!store.isOpen) {
    return (
      <StateView
        title="المتجر مغلق"
        description="لا يمكن إضافة منتجات أو بدء طلب جديد حتى يعود المتجر إلى الحالة النشطة."
        {...(onBack ? { actionLabel: "العودة", onActionPress: onBack } : {})}
      />
    );
  }
  if (store.availableFulfillmentModes.length === 0) {
    return (
      <StateView
        title="لا توجد وسيلة استلام"
        description="لم يفعّل المتجر أي مسار fulfillment صالح للعميل."
        {...(onBack ? { actionLabel: "العودة", onActionPress: onBack } : {})}
      />
    );
  }

  const catalog = catalogCtrl.state.catalog;
  const categories = catalog.categories.filter(
    (category: CatalogCategory) => category.isActive,
  );
  const products = catalog.products.filter(
    (product: CatalogProduct) => product.isActive,
  );

  return (
    <StoreDetailShell
      store={store}
      categories={categories}
      products={products}
      favoriteIds={storeCtrl.favoriteIds}
      onToggleFavorite={storeCtrl.toggleFavorite}
      onAddToCart={handleAddToCart}
      onBack={onBack}
      onGoToCart={onGoToCart}
    />
  );
}
