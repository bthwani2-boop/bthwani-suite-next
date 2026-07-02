import React from 'react';
import { StoreDetailScreen } from './StoreDetailScreen';

type Props = Readonly<{
  storeId: string;
  onBack?: (() => void) | undefined;
  onGoToCart?: (() => void) | undefined;
}>;

export function StoreDetailRoute({ storeId, onBack, onGoToCart }: Props) {
  return <StoreDetailScreen storeId={storeId} onBack={onBack} onGoToCart={onGoToCart} />;
}
