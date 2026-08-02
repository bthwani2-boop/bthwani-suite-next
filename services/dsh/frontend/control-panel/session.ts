"use client";

import React, { type ReactNode } from "react";
import { useIdentitySession } from "@bthwani/core-identity";

export { ControlPanelAuthBoundary } from "../shared/session/ControlPanelAuthBoundary";
export { ControlPanelUserMenu } from "../shared/session/ControlPanelUserMenu";
export { ControlPanelNotificationsBell } from "../shared/session/ControlPanelNotificationsBell";
export { useControlPanelServiceHealth } from "../shared/session/use-control-panel-service-health";
export { hasControlPanelPermission } from "../shared/session/control-panel-permissions";

export function ControlPanelSessionProvider({ children }: { readonly children: ReactNode }) {
  // core-identity handles session at the global scope once configured.
  return React.createElement(React.Fragment, null, children);
}

export function useControlPanelSession() {
  return useIdentitySession();
}


