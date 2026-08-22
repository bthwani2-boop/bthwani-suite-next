import { Redirect, useLocalSearchParams } from 'expo-router';
import { FieldRouteScreen, singleRouteParam } from '../../src/navigation/FieldRouteScreen';

export default function PartnerProgressRoute() {
  const { partnerId: rawPartnerId } = useLocalSearchParams<{ partnerId?: string | string[] }>();
  const partnerId = singleRouteParam(rawPartnerId);
  if (!partnerId) return <Redirect href="/" />;
  return <FieldRouteScreen route={{ kind: 'partner-progress', partnerId }} />;
}
