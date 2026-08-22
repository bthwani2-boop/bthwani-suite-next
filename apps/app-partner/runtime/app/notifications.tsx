import { useLocalSearchParams } from "expo-router";
import { PartnerRouteScreen, singleRouteParam } from "../src/navigation/PartnerRouteScreen";
export default function NotificationsRoute() {
  const { orderId: rawOrderId } = useLocalSearchParams<{ orderId?: string | string[] }>();
  const orderId = singleRouteParam(rawOrderId);
  return <PartnerRouteScreen route={{ kind: "bell", ...(orderId ? { orderId } : {}) }} />;
}
