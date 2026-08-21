import React from "react";
import { useRouter, type Href } from "expo-router";
import {
  dshPartnerRouteToPath,
  type DshPartnerNavigation,
  type DshPartnerNavigationRoute,
} from "@bthwani/dsh/app-partner";
import App from "../App";

export function singleRouteParam(value: string | string[] | undefined): string | undefined {
  const resolved = Array.isArray(value) ? value[0] : value;
  const normalized = resolved?.trim();
  return normalized ? normalized : undefined;
}

export function PartnerRouteScreen({ route }: { readonly route: DshPartnerNavigationRoute }) {
  const router = useRouter();
  const navigation = React.useMemo<DshPartnerNavigation>(() => ({
    navigate(nextRoute, mode = "push") {
      const href = dshPartnerRouteToPath(nextRoute) as Href;
      if (mode === "replace") router.replace(href);
      else router.push(href);
    },
    back() {
      if (router.canGoBack()) router.back();
      else router.replace("/orders" as Href);
    },
  }), [router]);

  return <App route={route} navigation={navigation} />;
}
