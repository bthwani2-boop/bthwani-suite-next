import React, { useCallback } from "react";
import { LoadingState, StateView } from "@bthwani/ui-kit";
import { useStorefrontController } from "../../shared/storefront";
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
  const storefrontCtrl = useStorefrontController(storeId);
  const cartCtrl = useCartController(storeId, authKind);

  const handleRetry = useCallback(() => {
    storefrontCtrl.retry();
    cartCtrl.retry();
  }, [storefrontCtrl, cartCtrl]);

  const handleAddToCart = useCallback(
    async (
      product: CatalogProduct,
      quantity: number,
      mode: DshFulfillmentDeliveryMode,
    ): Promise<boolean> =>
      cartCtrl.addItem({
        masterProductId: product.id,
        productName: product.name,
        priceReference: product.priceReference,
        quantity,
        fulfillmentMode: mode,
      }),
    [cartCtrl],
  );

  if (storefrontCtrl.state.kind === "loading") {
    return <LoadingState title="جاري تحميل واجهة المتجر…" />;
  }

  if (storefrontCtrl.state.kind === "not_found") {
    return (
      <StateView
        title="المتجر غير متوفر"
        description={storefrontCtrl.state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={handleRetry}
      />
    );
  }

  if (storefrontCtrl.state.kind === "error") {
    return (
      <StateView
        title="تعذر عرض المتجر"
        description={storefrontCtrl.state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={handleRetry}
      />
    );
  }

  if (storefrontCtrl.state.kind !== "success") {
    return (
      <StateView
        title="خطأ غير معروف"
        description="حدث خطأ غير معروف."
        actionLabel="إعادة المحاولة"
        onActionPress={handleRetry}
      />
    );
  }

  const store = storefrontCtrl.state.payload.store;
  if (store.publicationDecision !== "PUBLISHED") {
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

  const catalog = storefrontCtrl.state.payload.catalog;
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
      onAddToCart={handleAddToCart}
      cartActionError={cartCtrl.actionError}
      onBack={onBack}
      onGoToCart={onGoToCart}
    />
  );
}
