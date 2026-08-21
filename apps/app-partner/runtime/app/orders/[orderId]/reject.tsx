import { Redirect, useLocalSearchParams } from "expo-router";
import { PartnerRouteScreen, singleRouteParam } from "../../../src/navigation/PartnerRouteScreen";
export default function OrderRejectionRoute() {
  const { orderId: rawOrderId } = useLocalSearchParams<{ orderId?: string | string[] }>();
  const orderId = singleRouteParam(rawOrderId);
  if (!orderId) return <Redirect href="/orders" />;
  return <PartnerRouteScreen route={{ kind: "order-rejection", orderId }} />;
}
