import React from 'react';
import { StoreDetailScreen } from './StoreDetailScreen';

type Props = Readonly<{
  storeId: string;
  onBack?: (() => void) | undefined;
}>;

export function StoreDetailRoute({ storeId, onBack }: Props) {
  return <StoreDetailScreen storeId={storeId} onBack={onBack} />;
}
