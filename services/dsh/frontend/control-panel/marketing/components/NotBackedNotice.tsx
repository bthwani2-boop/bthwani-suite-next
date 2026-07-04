import { colorRoles } from '@bthwani/ui-kit';
import React from "react";

export function NotBackedNotice({ reason }: { readonly reason: string }) {
  return (
    <div
      role="status"
      style={{
        background: colorRoles.surfaceBase,
        border: `1px solid var(--status-warning-border, ${colorRoles.surfaceBase})`,
        color: `var(--status-warning-text, ${colorRoles.brandAction})`,
        borderRadius: "0.5rem",
        padding: "0.625rem 0.875rem",
        fontSize: "0.8rem",
        marginBottom: "1rem",
      }}
    >
      ⚠️ {reason}
    </div>
  );
}
