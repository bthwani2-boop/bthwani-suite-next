"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { colorRoles } from "@bthwani/ui-kit";
import { useControlPanelSession } from "./control-panel-session";

const DSH_LOGIN_ROUTE = "/" + "dsh" + "/login";

export function ControlPanelUserMenu() {
  const { state, logout } = useControlPanelSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (state.kind !== "authenticated") return null;

  const initial = state.identity.subject.slice(0, 1).toUpperCase();
  const roleLabel = state.identity.roles.join(", ");

  async function handleLogout(): Promise<void> {
    setOpen(false);
    await logout();
    router.replace(DSH_LOGIN_ROUTE);
  }

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          width: "2.25rem",
          height: "2.25rem",
          borderRadius: "50%",
          border: "none",
          background: colorRoles.brandStructure,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.75rem",
          fontWeight: 700,
          color: colorRoles.textInverse,
          cursor: "pointer",
        }}
        title={state.identity.subject}
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          dir="rtl"
          style={{
            position: "absolute",
            insetInlineEnd: 0,
            top: "calc(100% + 0.5rem)",
            minWidth: "12rem",
            background: colorRoles.surfaceBase,
            border: `1px solid ${colorRoles.borderSubtle}`,
            borderRadius: "0.625rem",
            padding: "0.5rem",
            zIndex: 50,
          }}
        >
          <div style={{ padding: "0.375rem 0.5rem" }}>
            <div style={{ fontSize: "0.875rem", fontWeight: 700 }}>{state.identity.subject}</div>
            <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>{roleLabel}</div>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleLogout()}
            style={{
              width: "100%",
              textAlign: "inherit",
              padding: "0.5rem",
              marginTop: "0.25rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "transparent",
              color: colorRoles.danger,
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            تسجيل الخروج
          </button>
        </div>
      )}
    </div>
  );
}
