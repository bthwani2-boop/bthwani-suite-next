import { Redirect, useLocalSearchParams } from "expo-router";
import { CaptainRouteScreen, singleRouteParam } from "../../../src/navigation/CaptainRouteScreen";

export default function CaptainOrderMapRoute() {
  const { assignmentId: rawAssignmentId } = useLocalSearchParams<{ assignmentId?: string | string[] }>();
  const assignmentId = singleRouteParam(rawAssignmentId);
  if (!assignmentId) return <Redirect href="/orders" />;
  return <CaptainRouteScreen route={{ kind: "map", assignmentId }} />;
}
