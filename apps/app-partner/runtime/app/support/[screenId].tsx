import { Redirect, useLocalSearchParams } from "expo-router";
import { parseDshPartnerSupportContext, parseDshPartnerSupportRouteId } from "@bthwani/dsh/app-partner";
import { PartnerRouteScreen, singleRouteParam } from "../../src/navigation/PartnerRouteScreen";
export default function SupportScreenRoute() {
  const params = useLocalSearchParams<Record<string, string | string[] | undefined>>();
  const screenId = parseDshPartnerSupportRouteId(singleRouteParam(params.screenId));
  if (!screenId) return <Redirect href="/support" />;
  const context = parseDshPartnerSupportContext({
    filterId: singleRouteParam(params.filterId),
    caseId: singleRouteParam(params.caseId),
    issueCategoryId: singleRouteParam(params.issueCategoryId),
    flowId: singleRouteParam(params.flowId),
    preferredScreen: singleRouteParam(params.preferredScreen),
    source: singleRouteParam(params.source),
  }, screenId);
  const orderId = singleRouteParam(params.orderId);
  return <PartnerRouteScreen route={{ kind: "support-screen", screenId, context, ...(orderId ? { orderId } : {}) }} />;
}
