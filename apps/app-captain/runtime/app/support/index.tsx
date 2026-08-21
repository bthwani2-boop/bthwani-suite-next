import { useLocalSearchParams } from "expo-router";
import { CaptainRouteScreen, singleRouteParam } from "../../src/navigation/CaptainRouteScreen";

export default function CaptainSupportDirectoryRoute() {
  const { assignmentId: rawAssignmentId } = useLocalSearchParams<{ assignmentId?: string | string[] }>();
  const assignmentId = singleRouteParam(rawAssignmentId);
  return <CaptainRouteScreen route={{ kind: "support-directory", ...(assignmentId ? { assignmentId } : {}) }} />;
}
