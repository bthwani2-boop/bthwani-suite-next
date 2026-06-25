import React, { useCallback } from 'react';
import { LoadingState, StateView } from '@bthwani/ui-kit';
import { useStoreDetailController } from '../../shared/store';
import { usePublishedCatalogController } from '../../shared/catalog';
import type { CatalogCategory, CatalogProduct } from '../../shared/catalog/catalog.types';
import { StoreDetailShell } from './StoreDetailShell';

type Props = Readonly<{
  storeId: string;
  onBack?: (() => void) | undefined;
}>;

export function StoreDetailScreen({ storeId, onBack }: Props) {
  const storeCtrl = useStoreDetailController(storeId);
  const catalogCtrl = usePublishedCatalogController(storeId);

  const handleRetry = useCallback(() => {
    storeCtrl.retry();
    catalogCtrl.retry();
  }, [storeCtrl, catalogCtrl]);

  if (storeCtrl.state.kind === 'loading' || catalogCtrl.state.kind === 'loading') {
    return <LoadingState title="جاري تحميل واجهة المتجر…" />;
  }

  if (storeCtrl.state.kind === 'service_unavailable') {
    return (
      <StateView
        title="الخدمة غير متاحة"
        description="تعذر الوصول إلى الخادم، يرجى المحاولة لاحقاً."
        actionLabel="إعادة المحاولة"
        onActionPress={handleRetry}
      />
    );
  }

  if (storeCtrl.state.kind === 'error') {
    return (
      <StateView
        title="تعذر تحميل المتجر"
        description={storeCtrl.state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={handleRetry}
      />
    );
  }

  if (catalogCtrl.state.kind === 'error' || catalogCtrl.state.kind === 'permission_denied') {
    const msg =
      catalogCtrl.state.kind === 'error'
        ? catalogCtrl.state.message
        : 'لا توجد صلاحيات لعرض كتالوج هذا المتجر.';
    return (
      <StateView
        title="تعذر تحميل المنتجات"
        description={msg}
        actionLabel="إعادة المحاولة"
        onActionPress={handleRetry}
      />
    );
  }

  if (storeCtrl.state.kind !== 'success' || catalogCtrl.state.kind !== 'success') {
    return null;
  }

  const store = storeCtrl.state.store;
  const catalog = catalogCtrl.state.catalog;
  const categories = catalog.categories.filter((c: CatalogCategory) => c.isActive);
  const products = catalog.products.filter((p: CatalogProduct) => p.isActive);

  return (
    <StoreDetailShell
      store={store}
      categories={categories}
      products={products}
      favoriteIds={storeCtrl.favoriteIds}
      onToggleFavorite={storeCtrl.toggleFavorite}
      onBack={onBack}
    />
  );
}
