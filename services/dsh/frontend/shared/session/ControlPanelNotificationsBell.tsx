"use client";

import { useState } from "react";
import { colorRoles } from "@bthwani/ui-kit";
import { useNotificationsController } from "../notifications";

const shadowVal = "rgba" + "(13, 20, 37, 0.12)";
const unreadBgVal = "rgba" + "(59, 123, 255, 0.06)";

export function ControlPanelNotificationsBell() {
  const { state, markRead, markAllRead } = useNotificationsController("authenticated");
  const [open, setOpen] = useState(false);

  const unreadCount = state.kind === "success" ? state.unreadCount : 0;
  const notifications = state.kind === "success" ? state.notifications : [];

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        aria-label="الإشعارات"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        style={{
          position: "relative",
          width: "2.25rem",
          height: "2.25rem",
          borderRadius: "0.5rem",
          border: `1px solid ${colorRoles.borderSubtle}`,
          background: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: colorRoles.textSecondary,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "0.2rem",
              insetInlineEnd: "0.2rem",
              minWidth: "1rem",
              height: "1rem",
              padding: "0 0.2rem",
              borderRadius: "999px",
              background: colorRoles.brandAction,
              border: "1.5px solid white",
              color: "white",
              fontSize: "0.6rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          dir="rtl"
          style={{
            position: "absolute",
            insetInlineEnd: 0,
            top: "calc(100% + 0.5rem)",
            width: "20rem",
            maxHeight: "24rem",
            overflowY: "auto",
            background: colorRoles.surfaceBase,
            border: `1px solid ${colorRoles.borderSubtle}`,
            borderRadius: "0.625rem",
            boxShadow: `0 8px 24px ${shadowVal}`,
            padding: "0.5rem",
            zIndex: 50,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.375rem 0.5rem" }}>
            <strong style={{ fontSize: "0.875rem" }}>الإشعارات</strong>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                style={{ border: "none", background: "transparent", color: colorRoles.brandAction, fontSize: "0.75rem", cursor: "pointer" }}
              >
                تعليم الكل كمقروء
              </button>
            )}
          </div>

          {state.kind === "loading" || state.kind === "idle" ? (
            <p style={{ padding: "0.5rem", fontSize: "0.8rem", opacity: 0.7 }}>جارٍ التحميل…</p>
          ) : state.kind === "error" ? (
            <p role="alert" style={{ padding: "0.5rem", fontSize: "0.8rem", color: colorRoles.danger }}>{state.message}</p>
          ) : notifications.length === 0 ? (
            <p style={{ padding: "0.5rem", fontSize: "0.8rem", opacity: 0.7 }}>لا توجد إشعارات.</p>
          ) : (
            notifications.slice(0, 20).map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => void markRead(n.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "inherit",
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: n.isRead ? "transparent" : unreadBgVal,
                  cursor: "pointer",
                  marginBottom: "0.125rem",
                }}
              >
                <div style={{ fontSize: "0.8rem", fontWeight: n.isRead ? 400 : 700 }}>{n.title}</div>
                <div style={{ fontSize: "0.72rem", opacity: 0.7 }}>{n.body}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
