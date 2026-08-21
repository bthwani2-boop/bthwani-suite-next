import { Redirect, useLocalSearchParams } from 'expo-router';
import { FieldRouteScreen, singleRouteParam } from '../../../src/navigation/FieldRouteScreen';

export default function AssignmentOnboardingRoute() {
  const { assignmentId: rawAssignmentId } = useLocalSearchParams<{ assignmentId?: string | string[] }>();
  const assignmentId = singleRouteParam(rawAssignmentId);
  if (!assignmentId) return <Redirect href="/work-queue" />;
  return <FieldRouteScreen route={{ kind: 'onboarding', assignmentId }} />;
}
