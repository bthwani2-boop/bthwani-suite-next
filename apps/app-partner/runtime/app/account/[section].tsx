import { Redirect, useLocalSearchParams } from "expo-router";
import { parseDshPartnerHubSection } from "@bthwani/dsh/app-partner";
import { PartnerRouteScreen, singleRouteParam } from "../../src/navigation/PartnerRouteScreen";
export default function AccountSectionRoute() {
  const { section: rawSection } = useLocalSearchParams<{ section?: string | string[] }>();
  const section = parseDshPartnerHubSection(singleRouteParam(rawSection));
  if (!section) return <Redirect href="/account/hub" />;
  return <PartnerRouteScreen route={{ kind: "home", section }} />;
}
