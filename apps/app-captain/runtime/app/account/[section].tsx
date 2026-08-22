import { Redirect, useLocalSearchParams } from "expo-router";
import { parseDshCaptainAccountSection } from "@bthwani/dsh/app-captain";
import { CaptainRouteScreen, singleRouteParam } from "../../src/navigation/CaptainRouteScreen";

export default function CaptainAccountSectionRoute() {
  const { section: rawSection } = useLocalSearchParams<{ section?: string | string[] }>();
  const section = parseDshCaptainAccountSection(singleRouteParam(rawSection));
  if (!section) return <Redirect href="/account" />;
  return <CaptainRouteScreen route={{ kind: "account-section", section }} />;
}
