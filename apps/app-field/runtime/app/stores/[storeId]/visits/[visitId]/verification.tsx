import { Redirect, useLocalSearchParams } from 'expo-router';
import { FieldRouteScreen, singleRouteParam } from '../../../../../src/navigation/FieldRouteScreen';

export default function VerificationRoute() {
  const params = useLocalSearchParams<{ storeId?: string | string[]; visitId?: string | string[] }>();
  const storeId = singleRouteParam(params.storeId);
  const visitId = singleRouteParam(params.visitId);
  if (!storeId || !visitId) return <Redirect href="/" />;
  return <FieldRouteScreen route={{ kind: 'verification', storeId, visitId }} />;
}
