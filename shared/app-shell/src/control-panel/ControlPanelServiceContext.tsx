import { createContext, useContext, type ReactNode } from "react";
import type { ControlPanelServiceRegistration } from "./ControlPanelServiceRegistry";
import type { ControlPanelSection } from "./ControlPanelSectionRegistry";

export type ControlPanelServiceContextValue = {
  readonly activeService: ControlPanelServiceRegistration | null;
  readonly activeSection: ControlPanelSection | null;
  readonly registeredServices: ReadonlyArray<ControlPanelServiceRegistration>;
};

const ControlPanelServiceCtx = createContext<ControlPanelServiceContextValue>({
  activeService: null,
  activeSection: null,
  registeredServices: [],
});

export type ControlPanelServiceContextProps = {
  readonly value: ControlPanelServiceContextValue;
  readonly children: ReactNode;
};

export function ControlPanelServiceContext({
  value,
  children,
}: ControlPanelServiceContextProps) {
  return (
    <ControlPanelServiceCtx.Provider value={value}>
      {children}
    </ControlPanelServiceCtx.Provider>
  );
}

export function useControlPanelService(): ControlPanelServiceContextValue {
  return useContext(ControlPanelServiceCtx);
}
