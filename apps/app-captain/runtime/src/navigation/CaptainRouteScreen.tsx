import React from "react";
import { useRouter, type Href } from "expo-router";
import {
  dshCaptainRouteToPath,
  type DshCaptainNavigation,
  type DshCaptainNavigationRoute,
} from "@bthwani/dsh/app-captain";
import App from "../App";

export function singleRouteParam(value: string | string[] | undefined): string | undefined {
  const resolved = Array.isArray(value) ? value[0] : value;
  const normalized = resolved?.trim();
  return normalized ? normalized : undefined;
}

export function CaptainRouteScreen({ route }: { readonly route: DshCaptainNavigationRoute }) {
  const router = useRouter();
  const navigation = React.useMemo<DshCaptainNavigation>(() => ({
    navigate(nextRoute, mode = "push") {
      const href = dshCaptainRouteToPath(nextRoute) as Href;
      if (mode === "replace") router.replace(href);
      else router.push(href);
    },
    back() {
      if (router.canGoBack()) router.back();
      else router.replace("/" as Href);
    },
  }), [router]);

  return <App route={route} navigation={navigation} />;
}
