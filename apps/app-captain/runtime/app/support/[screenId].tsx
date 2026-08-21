import { Redirect, useLocalSearchParams } from "expo-router";
import { parseDshCaptainSupportRoute } from "@bthwani/dsh/app-captain";
import { CaptainRouteScreen, singleRouteParam } from "../../src/navigation/CaptainRouteScreen";

export default function CaptainSupportScreenRoute() {
  const params = useLocalSearchParams<{ screenId?: string | string[]; assignmentId?: string | string[] }>();
  const screenId = parseDshCaptainSupportRoute(singleRouteParam(params.screenId));
  if (!screenId) return <Redirect href="/support" />;
  const assignmentId = singleRouteParam(params.assignmentId);
  return <CaptainRouteScreen route={{ kind: "support-screen", screenId, ...(assignmentId ? { assignmentId } : {}) }} />;
}
