import { useLocalSearchParams } from 'expo-router';
import { FieldRouteScreen, singleRouteParam } from '../../src/navigation/FieldRouteScreen';

export default function OnboardingRoute() {
  const { partnerId: rawPartnerId } = useLocalSearchParams<{ partnerId?: string | string[] }>();
  const partnerId = singleRouteParam(rawPartnerId);
  return <FieldRouteScreen route={{ kind: 'onboarding', ...(partnerId ? { partnerId } : {}) }} />;
}
