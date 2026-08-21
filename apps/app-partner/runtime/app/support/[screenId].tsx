import { Redirect, useLocalSearchParams } from "expo-router";
import { parseDshPartnerSupportContext, parseDshPartnerSupportRouteId } from "@bthwani/dsh/app-partner";
import { PartnerRouteScreen, singleRouteParam } from "../../src/navigation/PartnerRouteScreen";
export default function SupportScreenRoute() {
  const params = useLocalSearchParams<{
    screenId?: string | string[];
    filterId?: string | string[];
    caseId?: string | string[];
    issueCategoryId?: string | string[];
    flowId?: string | string[];
    preferredScreen?: string | string[];
    source?: string | string[];
    orderId?: string | string[];
  }>();
  const screenId = parseDshPartnerSupportRouteId(singleRouteParam(params.screenId));
  if (!screenId) return <Redirect href="/support" />;
  const filterId = singleRouteParam(params.filterId);
  const caseId = singleRouteParam(params.caseId);
  const issueCategoryId = singleRouteParam(params.issueCategoryId);
  const flowId = singleRouteParam(params.flowId);
  const preferredScreen = singleRouteParam(params.preferredScreen);
  const source = singleRouteParam(params.source);
  const context = parseDshPartnerSupportContext({
    ...(filterId ? { filterId } : {}),
    ...(caseId ? { caseId } : {}),
    ...(issueCategoryId ? { issueCategoryId } : {}),
    ...(flowId ? { flowId } : {}),
    ...(preferredScreen ? { preferredScreen } : {}),
    ...(source ? { source } : {}),
  }, screenId);
  const orderId = singleRouteParam(params.orderId);
  return <PartnerRouteScreen route={{ kind: "support-screen", screenId, context, ...(orderId ? { orderId } : {}) }} />;
}
