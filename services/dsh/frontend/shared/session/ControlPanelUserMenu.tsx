"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useControlPanelSession } from "./control-panel-session";

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
    router.replace("/dsh/login");
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
          background: "var(--grad-blue, linear-gradient(135deg,rgb(59, 123, 255),rgb(94, 151, 255)))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.75rem",
          fontWeight: 700,
          color: "rgb(255, 255, 255)",
          cursor: "pointer",
          boxShadow: "0 0 0 2px rgba(59,123,255,0.2)",
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
            background: "var(--card-bg, rgb(255, 255, 255))",
            border: "1px solid var(--card-border, rgb(226, 232, 243))",
            borderRadius: "0.625rem",
            boxShadow: "0 8px 24px rgba(13, 20, 37, 0.12)",
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
              color: "rgb(220, 38, 38)",
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
