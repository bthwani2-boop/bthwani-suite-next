"use client";

import { Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ControlPanelLoginScreen } from "@bthwani/dsh/control-panel";
import { resolveControlPanelReturnTo } from "@bthwani/dsh/control-panel-routes";
import { requestControlPanelDevSession } from "./dev-session.adapter";
import { controlPanelDevelopmentMode } from "./runtime-config";

export default function DshLoginPage() {
  return (
    <Suspense fallback={null}>
      <DshLoginRouteAdapter />
    </Suspense>
  );
}

function DshLoginRouteAdapter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = resolveControlPanelReturnTo(searchParams.get("returnTo"));
  const handleAuthenticated = useCallback(
    (target: string) => router.replace(target),
    [router],
  );

  return (
    <ControlPanelLoginScreen
      returnTo={returnTo}
      onAuthenticated={handleAuthenticated}
      developmentMode={controlPanelDevelopmentMode}
      requestDevelopmentSession={requestControlPanelDevSession}
    />
  );
}
