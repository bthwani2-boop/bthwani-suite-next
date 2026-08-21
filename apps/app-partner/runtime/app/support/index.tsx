import { useLocalSearchParams } from "expo-router";
import { parseDshPartnerSupportContext } from "@bthwani/dsh/app-partner";
import { PartnerRouteScreen, singleRouteParam } from "../../src/navigation/PartnerRouteScreen";
export default function SupportDirectoryRoute() {
  const params = useLocalSearchParams<Record<string, string | string[] | undefined>>();
  const context = parseDshPartnerSupportContext({
    filterId: singleRouteParam(params.filterId),
    caseId: singleRouteParam(params.caseId),
    issueCategoryId: singleRouteParam(params.issueCategoryId),
    flowId: singleRouteParam(params.flowId),
    preferredScreen: singleRouteParam(params.preferredScreen),
    source: singleRouteParam(params.source),
  });
  const orderId = singleRouteParam(params.orderId);
  return <PartnerRouteScreen route={{ kind: "support-directory", context, ...(orderId ? { orderId } : {}) }} />;
}
