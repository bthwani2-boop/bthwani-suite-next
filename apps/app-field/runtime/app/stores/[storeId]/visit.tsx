import { Redirect, useLocalSearchParams } from 'expo-router';
import { FieldRouteScreen, singleRouteParam } from '../../../src/navigation/FieldRouteScreen';

export default function VisitRoute() {
  const { storeId: rawStoreId } = useLocalSearchParams<{ storeId?: string | string[] }>();
  const storeId = singleRouteParam(rawStoreId);
  if (!storeId) return <Redirect href="/" />;
  return <FieldRouteScreen route={{ kind: 'visit', storeId }} />;
}
