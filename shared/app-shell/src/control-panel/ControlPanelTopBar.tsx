import type { ReactNode } from "react";

export type ControlPanelTopBarProps = {
  readonly logo?: ReactNode;
  readonly title?: ReactNode;
  readonly serviceLabel?: ReactNode;
  readonly search?: ReactNode;
  readonly notifications?: ReactNode;
  readonly actions?: ReactNode;
  readonly userMenu?: ReactNode;
  readonly dir?: "ltr" | "rtl";
};

export function ControlPanelTopBar({
  logo,
  title,
  serviceLabel,
  search,
  notifications,
  actions,
  userMenu,
  dir = "rtl",
}: ControlPanelTopBarProps) {
  return (
    <header
      dir={dir}
      style={{ display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}
    >
      {logo != null ? <div style={{ flexShrink: 0 }}>{logo}</div> : null}
      {title != null ? <div style={{ flexShrink: 0 }}>{title}</div> : null}
      {serviceLabel != null ? <div style={{ flexShrink: 0 }}>{serviceLabel}</div> : null}
      <div style={{ flex: 1 }}>{search}</div>
      {notifications != null ? <div style={{ flexShrink: 0 }}>{notifications}</div> : null}
      {actions != null ? <div style={{ flexShrink: 0 }}>{actions}</div> : null}
      {userMenu != null ? <div style={{ flexShrink: 0 }}>{userMenu}</div> : null}
    </header>
  );
}
