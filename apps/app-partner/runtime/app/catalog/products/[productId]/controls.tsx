import { Redirect, useLocalSearchParams } from 'expo-router';
import { PartnerRouteScreen, singleRouteParam } from '../../../../src/navigation/PartnerRouteScreen';

export default function ProductControlsRoute() {
  const { productId: rawProductId } = useLocalSearchParams<{ productId?: string | string[] }>();
  const productId = singleRouteParam(rawProductId);
  if (!productId) return <Redirect href="/catalog" />;
  return <PartnerRouteScreen route={{ kind: 'product-controls', productId }} />;
}
