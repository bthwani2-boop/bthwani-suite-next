import { useLocalSearchParams } from "expo-router";
import { PartnerRouteScreen, singleRouteParam } from "../../src/navigation/PartnerRouteScreen";
export default function OrdersRoute() {
  const { search: rawSearch } = useLocalSearchParams<{ search?: string | string[] }>();
  return <PartnerRouteScreen route={{ kind: "inbox", ...(singleRouteParam(rawSearch) === "1" ? { search: true } : {}) }} />;
}
